import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { database, rows, sql, pool } from "../src/server/db";
import { execute } from "../src/server/execute";
import { snapshot } from "../src/server/snapshot";
import type { Actor } from "../src/domain/types";
import type { Command } from "../src/domain/orders/commands";
const w = randomUUID(),
  other = randomUUID();
const admin: Actor = { workspaceId: w, userId: "admin", role: "ADMIN" };
const send = (c: Command, key = randomUUID(), a = admin, generation = 1) =>
  execute(a, c, key, generation);
const fields = (p: string, q = 2) => ({
  sourceReference: "TEST-IRSALIYE",
  sourceOrderId: null,
  reason: "İzole belge kontrolü",
  lines: [{ productId: p, quantity: q }],
});
async function product() {
  const id = randomUUID();
  await database().execute(
    sql`INSERT INTO products(workspace_id,id,sku,name,variant,barcode,category,cost_try,price_rub,threshold) VALUES(${w}::uuid,${id},${id},'Test','Mavi',${id},'Test',100,200,1)`,
  );
  await send({
    action: "ADJUST",
    productId: id,
    quantity: 10,
    reason: "Test açılışı",
  });
  return id;
}
async function create(p: string, kind: "COUNT" | "RECEIPT" = "RECEIPT", q = 2) {
  return (
    await send({ action: "CREATE_INVENTORY_DOCUMENT", kind, ...fields(p, q) })
  ).reference;
}
async function state(id: string) {
  const [d] = await rows<{ status: string; version: number }>(
    database(),
    sql`SELECT status,version FROM inventory_documents WHERE workspace_id=${w}::uuid AND id=${id}`,
  );
  const moves = await rows<{ quantity: number }>(
    database(),
    sql`SELECT quantity FROM stock_ledger WHERE workspace_id=${w}::uuid AND reference=${id}`,
  );
  return { d, moves };
}
describe.skipIf(process.env.INVENTORY_DB_TEST !== "1")(
  "INV-01 PostgreSQL documents",
  () => {
    beforeAll(async () => {
      for (const id of [w, other])
        await database().transaction(async (tx) => {
          await tx.execute(
            sql`INSERT INTO workspaces(id,name) VALUES(${id}::uuid,'INV-01 isolated')`,
          );
          await tx.execute(
            sql`INSERT INTO users(workspace_id,id,name,role) VALUES(${id}::uuid,'admin','Admin','ADMIN'),(${id}::uuid,'warehouse','Depo','WAREHOUSE'),(${id}::uuid,'accountant','Muhasebe','ACCOUNTANT')`,
          );
          await tx.execute(
            sql`INSERT INTO stores VALUES(${id}::uuid,'ozon-demo','Test')`,
          );
          await tx.execute(
            sql`INSERT INTO warehouses VALUES(${id}::uuid,'MAIN','Test','SELLABLE'),(${id}::uuid,'QUARANTINE','QC','QUARANTINE')`,
          );
        });
    });
    afterAll(async () => {
      await database().execute(
        sql`DELETE FROM workspaces WHERE id IN (${w}::uuid,${other}::uuid)`,
      );
      await pool().end();
    });
    it("draft leaves stock unchanged; approval records exactly one movement even with retries and competing keys", async () => {
      const p = await product(),
        id = await create(p),
        c: Command = {
          action: "CONFIRM_INVENTORY_DOCUMENT",
          documentId: id,
          version: 0,
        },
        key = randomUUID();
      expect((await state(id)).moves).toHaveLength(0);
      const results = await Promise.allSettled([
        send(c, key),
        send(c, randomUUID()),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const firstKeySucceeded = results[0].status === "fulfilled";
      if (firstKeySucceeded)
        await expect(send(c, key)).resolves.toEqual({ reference: id });
      expect((await state(id)).moves).toEqual([{ quantity: 2 }]);
      expect((await state(id)).d.status).toBe("CONFIRMED");
    });
    it("count uses physical target and leaves quarantine untouched; zero delta makes no movement", async () => {
      const p = await product(),
        id = await create(p, "COUNT", 7);
      await send({
        action: "CONFIRM_INVENTORY_DOCUMENT",
        documentId: id,
        version: 0,
      });
      expect((await state(id)).moves).toEqual([{ quantity: -3 }]);
      const noChange = await create(p, "COUNT", 7);
      await send({
        action: "CONFIRM_INVENTORY_DOCUMENT",
        documentId: noChange,
        version: 0,
      });
      expect((await state(noChange)).moves).toHaveLength(0);
      const s = await snapshot(admin);
      expect(s.products.find((x) => x.id === p)?.quarantine).toBe(0);
      expect(
        s.inventoryDocuments?.find((x) => x.id === id)?.lines[0].delta,
      ).toBe(-3);
    });
    it("stale count requires refreshing draft and rejects stale version", async () => {
      const p = await product(),
        id = await create(p, "COUNT", 8);
      await send({
        action: "ADJUST",
        productId: p,
        quantity: 1,
        reason: "Araya giren hareket",
      });
      await expect(
        send({
          action: "CONFIRM_INVENTORY_DOCUMENT",
          documentId: id,
          version: 0,
        }),
      ).rejects.toThrow("stok değişti");
      await send({
        action: "UPDATE_INVENTORY_DOCUMENT",
        documentId: id,
        version: 0,
        ...fields(p, 8),
      });
      await expect(
        send({
          action: "CONFIRM_INVENTORY_DOCUMENT",
          documentId: id,
          version: 0,
        }),
      ).rejects.toThrow("değişti");
      await send({
        action: "CONFIRM_INVENTORY_DOCUMENT",
        documentId: id,
        version: 1,
      });
      expect((await state(id)).moves).toEqual([{ quantity: -3 }]);
    });
    it("reserved floor rejects count and rolls back all earlier lines", async () => {
      const p1 = await product(),
        p2 = await product();
      const order = await send({
        action: "CREATE_ORDER",
        customer: "Test alıcı",
        currency: "RUB",
        fxRate: 500000,
        fxDate: "2026-10-21",
        commissionBps: 0,
        logistics: 0,
        lines: [{ productId: p2, quantity: 5 }],
      });
      await send({ action: "RESERVE", orderId: order.reference });
      const id = (
        await send({
          action: "CREATE_INVENTORY_DOCUMENT",
          kind: "COUNT",
          ...fields(p1),
          lines: [
            { productId: p1, quantity: 8 },
            { productId: p2, quantity: 2 },
          ],
        })
      ).reference;
      await expect(
        send({
          action: "CONFIRM_INVENTORY_DOCUMENT",
          documentId: id,
          version: 0,
        }),
      ).rejects.toThrow("rezerve");
      expect((await state(id)).moves).toHaveLength(0);
      expect((await state(id)).d.status).toBe("DRAFT");
    });
    it("enforces workspace, active role, generation, duplicate SKU and source order constraints", async () => {
      const p = await product(),
        id = await create(p);
      await expect(
        send(
          { action: "CONFIRM_INVENTORY_DOCUMENT", documentId: id, version: 0 },
          randomUUID(),
          { ...admin, workspaceId: other },
        ),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        send(
          {
            action: "CREATE_INVENTORY_DOCUMENT",
            kind: "RECEIPT",
            ...fields(p),
          },
          randomUUID(),
          { ...admin, userId: "accountant", role: "ACCOUNTANT" },
        ),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        send({
          action: "CREATE_INVENTORY_DOCUMENT",
          kind: "RECEIPT",
          ...fields(p),
          lines: [
            { productId: p, quantity: 1 },
            { productId: p, quantity: 2 },
          ],
        }),
      ).rejects.toThrow("tek satır");
      await expect(
        send({
          action: "CREATE_INVENTORY_DOCUMENT",
          kind: "RECEIPT",
          ...fields(p),
          sourceOrderId: "missing",
        }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        send(
          { action: "CONFIRM_INVENTORY_DOCUMENT", documentId: id, version: 0 },
          randomUUID(),
          admin,
          2,
        ),
      ).rejects.toThrow("sıfırlandı");
      await send(
        { action: "CONFIRM_INVENTORY_DOCUMENT", documentId: id, version: 0 },
        randomUUID(),
        { ...admin, userId: "warehouse", role: "WAREHOUSE" },
      );
    });
    it("cancelled draft remains historical and cannot alter stock", async () => {
      const p = await product(),
        id = await create(p);
      await send({
        action: "CANCEL_INVENTORY_DOCUMENT",
        documentId: id,
        version: 0,
        reason: "Yanlış kaynak belge",
      });
      await expect(
        send({
          action: "CONFIRM_INVENTORY_DOCUMENT",
          documentId: id,
          version: 1,
        }),
      ).rejects.toThrow("taslak değil");
      expect((await state(id)).moves).toHaveLength(0);
    });
    it("a late audit failure rolls back approval and ledger atomically", async () => {
      const p = await product(),
        id = await create(p);
      await database().execute(
        sql.raw(
          `CREATE OR REPLACE FUNCTION inv01_test_audit_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.workspace_id = '${w}'::uuid AND NEW.action = 'CONFIRM_INVENTORY_DOCUMENT' THEN RAISE EXCEPTION 'INV-01 test rollback'; END IF; RETURN NEW; END $$`,
        ),
      );
      await database().execute(
        sql.raw(
          "CREATE TRIGGER inv01_test_audit_guard BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION inv01_test_audit_guard()",
        ),
      );
      try {
        await expect(
          send({
            action: "CONFIRM_INVENTORY_DOCUMENT",
            documentId: id,
            version: 0,
          }),
        ).rejects.toThrow();
        expect((await state(id)).d.status).toBe("DRAFT");
        expect((await state(id)).moves).toHaveLength(0);
      } finally {
        await database().execute(
          sql.raw("DROP TRIGGER inv01_test_audit_guard ON audit_events"),
        );
        await database().execute(
          sql.raw("DROP FUNCTION inv01_test_audit_guard()"),
        );
      }
    });
  },
);
