import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { database, rows, sql, pool } from "../src/server/db";
import { execute } from "../src/server/execute";
import { snapshot } from "../src/server/snapshot";
import { demoProviders } from "../src/server/services/integrations";
import { profitability } from "../src/domain/finance/calculations";
import type { Actor } from "../src/domain/types";
import type { Command } from "../src/domain/orders/commands";
const w = randomUUID(),
  other = randomUUID(),
  admin: Actor = { workspaceId: w, userId: "admin", role: "ADMIN" };
const send = (
  c: Command,
  providers = demoProviders(),
  key = randomUUID(),
  a = admin,
) => execute(a, c, key, 1, providers);
async function ready(cost: number | null = 100) {
  const id = randomUUID();
  await database().transaction(async (tx) => {
    await tx.execute(
      sql`INSERT INTO orders VALUES(${w}::uuid,${id},'ozon-demo',${id},'Test alıcı','FBS','READY','TRY',now(),null,'2026-10-21',1000000,0,0)`,
    );
    await tx.execute(
      sql`INSERT INTO order_lines VALUES(${w}::uuid,${id},'p',1,1,500,${cost})`,
    );
    await tx.execute(
      sql`INSERT INTO reservations VALUES(${w}::uuid,${id},'p','MAIN',1,true)`,
    );
  });
  return id;
}
async function current(id: string) {
  return (await snapshot(admin)).orders.find((o) => o.id === id)!;
}
async function counts(id: string) {
  const [r] = await rows<{
    status: string;
    moves: number;
    invoices: number;
    events: number;
    history: number;
    costs: number;
  }>(
    database(),
    sql`SELECT o.status,(SELECT count(*)::int FROM stock_ledger WHERE workspace_id=${w}::uuid AND reference=${id}) moves,(SELECT count(*)::int FROM invoices WHERE workspace_id=${w}::uuid AND order_id=${id}) invoices,(SELECT count(*)::int FROM integration_events WHERE workspace_id=${w}::uuid AND order_id=${id}) events,(SELECT count(*)::int FROM invoice_events WHERE workspace_id=${w}::uuid AND order_id=${id}) history,(SELECT count(*)::int FROM financial_entries WHERE workspace_id=${w}::uuid AND order_id=${id} AND kind='COGS') costs FROM orders o WHERE o.workspace_id=${w}::uuid AND o.id=${id}`,
  );
  return r;
}
describe.skipIf(process.env.OPERATIONS_DB_TEST !== "1")(
  "INT-01 FIN-01 DOC-01 PostgreSQL",
  () => {
    beforeAll(async () => {
      for (const id of [w, other])
        await database().transaction(async (tx) => {
          await tx.execute(
            sql`INSERT INTO workspaces(id,name,settings) VALUES(${id}::uuid,'Completion isolated','{"autoDraft":true}')`,
          );
          await tx.execute(
            sql`INSERT INTO users(workspace_id,id,name,role) VALUES(${id}::uuid,'admin','Admin','ADMIN'),(${id}::uuid,'warehouse','Depo','WAREHOUSE'),(${id}::uuid,'accountant','Muhasebe','ACCOUNTANT')`,
          );
          await tx.execute(
            sql`INSERT INTO stores VALUES(${id}::uuid,'ozon-demo','Test')`,
          );
          await tx.execute(
            sql`INSERT INTO warehouses VALUES(${id}::uuid,'MAIN','Test','SELLABLE'),(${id}::uuid,'QUARANTINE','Test QC','QUARANTINE')`,
          );
          await tx.execute(
            sql`INSERT INTO products(workspace_id,id,sku,name,variant,barcode,category,cost_try,price_rub,threshold) VALUES(${id}::uuid,'p','TEST','Test','Mavi','TEST-BARCODE','Test',null,500,0)`,
          );
          await tx.execute(
            sql`INSERT INTO stock_ledger VALUES(${id}::uuid,${randomUUID()},'p','MAIN',100,'OPENING','test-opening','Test','admin',now())`,
          );
        });
    }, 120000);
    afterAll(async () => {
      try {
        await database().execute(
          sql`DELETE FROM workspaces WHERE id IN (${w}::uuid,${other}::uuid)`,
        );
      } finally {
        await pool().end();
      }
    }, 120000);
    it("shipment and unique invoice call injected providers once and retain invoice history", async () => {
      const id = await ready(),
        providers = demoProviders(),
        status = vi.spyOn(providers.ozon, "syncStatus"),
        invoice = vi.spyOn(providers.parasut, "salesInvoice");
      await send({ action: "SHIP", orderId: id }, providers);
      await send({ action: "SHIP", orderId: id }, providers);
      await send({ action: "INVOICE", orderId: id }, providers);
      expect(status).toHaveBeenCalledOnce();
      expect(invoice).toHaveBeenCalledOnce();
      expect(await counts(id)).toMatchObject({
        status: "SHIPPED",
        moves: 1,
        invoices: 1,
        events: 2,
        history: 1,
        costs: 1,
      });
      for (const value of ["ERROR", "CANCELLED", "DRAFT"] as const)
        await send({
          action: "INVOICE_STATUS",
          orderId: id,
          status: value,
          reason: "Belge kontrolü",
        });
      expect((await counts(id)).history).toBe(4);
      await send({
        action: "RETURN",
        orderId: id,
        reason: "Demo iade kontrolü",
      });
      expect((await counts(id)).history).toBe(5);
      await expect(
        send({
          action: "INVOICE_STATUS",
          orderId: id,
          status: "DRAFT",
          reason: "Uygun olmayan yeniden açma",
        }),
      ).rejects.toThrow("aktifleştirilemez");
    }, 120000);
    it("provider failures roll back shipment, stock, finance, draft and history", async () => {
      const id = await ready(),
        p = demoProviders(),
        key = randomUUID();
      vi.spyOn(p.parasut, "salesInvoice").mockRejectedValueOnce(
        new Error("Test provider unavailable"),
      );
      await expect(
        send({ action: "SHIP", orderId: id }, p, key),
      ).rejects.toThrow();
      expect(await counts(id)).toMatchObject({
        status: "READY",
        moves: 0,
        invoices: 0,
        events: 0,
        history: 0,
        costs: 0,
      });
      await send({ action: "SHIP", orderId: id }, demoProviders(), key);
      expect((await counts(id)).status).toBe("SHIPPED");
      const id2 = await ready(),
        bad = demoProviders();
      vi.spyOn(bad.ozon, "syncStatus").mockResolvedValue({
        mode: "demo",
        sent: true,
        externalId: null,
      });
      await expect(send({ action: "SHIP", orderId: id2 }, bad)).rejects.toThrow(
        "dış gönderim",
      );
      expect((await counts(id2)).moves).toBe(0);
    }, 120000);
    it("missing cost completion is immutable, idempotent, role-scoped and redacted", async () => {
      const id = await ready(null);
      await send({ action: "SHIP", orderId: id });
      expect((await counts(id)).costs).toBe(0);
      const key = randomUUID(),
        c: Command = {
          action: "CORRECT_MISSING_COST",
          orderId: id,
          productId: "p",
          costTry: 200,
          reason: "Tedarikçi maliyet belgesi",
        };
      await send(c, demoProviders(), key, {
        ...admin,
        userId: "accountant",
        role: "ACCOUNTANT",
      });
      await send(c, demoProviders(), key, {
        ...admin,
        userId: "accountant",
        role: "ACCOUNTANT",
      });
      const o = await current(id);
      expect(o.lines[0].unit_cost_try).toBeNull();
      expect(o.cost_corrections?.p).toBe(200);
      expect((await counts(id)).costs).toBe(1);
      const s = await snapshot(admin);
      expect(profitability(o, s.financial)).toMatchObject({
        complete: true,
        cost: 200,
        contribution: 300,
      });
      await expect(send(c)).rejects.toThrow("zaten");
      await expect(
        send(c, demoProviders(), randomUUID(), {
          ...admin,
          userId: "warehouse",
          role: "WAREHOUSE",
        }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        send(c, demoProviders(), randomUUID(), {
          ...admin,
          workspaceId: other,
        }),
      ).rejects.toMatchObject({ status: 404 });
      const redacted = await snapshot({
        ...admin,
        userId: "warehouse",
        role: "WAREHOUSE",
      });
      expect(
        redacted.orders.find((x) => x.id === id)?.cost_corrections,
      ).toEqual({});
      expect(redacted.financial).toEqual([]);
      expect(redacted.invoiceEvents).toEqual([]);
      expect(
        redacted.audit.some((e) => e.action === "CORRECT_MISSING_COST"),
      ).toBe(false);
    }, 120000);
    it("cost completed after accepted QC posts both cost and reversal without changing historical line", async () => {
      const id = await ready(null);
      await send({ action: "SHIP", orderId: id });
      await send({ action: "RETURN", orderId: id, reason: "Test tam iade" });
      await send({
        action: "QC",
        orderId: id,
        accept: true,
        reason: "Satışa uygun ürün",
      });
      await send({
        action: "CORRECT_MISSING_COST",
        orderId: id,
        productId: "p",
        costTry: 300,
        reason: "Sonradan gelen maliyet",
      });
      const s = await snapshot(admin),
        o = s.orders.find((x) => x.id === id)!;
      expect(o.lines[0].unit_cost_try).toBeNull();
      expect(profitability(o, s.financial)).toMatchObject({
        complete: true,
        cost: 0,
        contribution: 0,
      });
      expect(
        s.financial.filter(
          (e) => e.order_id === id && e.kind === "COGS_REVERSAL",
        ),
      ).toHaveLength(1);
    }, 120000);
    it("partial missing costs remain incomplete until every line is resolved", async () => {
      const id = await ready(null);
      await database().transaction(async (tx) => {
        await tx.execute(
          sql`INSERT INTO products(workspace_id,id,sku,name,variant,barcode,category,cost_try,price_rub,threshold) VALUES(${w}::uuid,'p2','TEST2','Test2','Mavi','TEST2-BARCODE','Test',null,500,0)`,
        );
        await tx.execute(
          sql`INSERT INTO stock_ledger VALUES(${w}::uuid,${randomUUID()},'p2','MAIN',10,'OPENING','test-opening2','Test','admin',now())`,
        );
        await tx.execute(
          sql`INSERT INTO order_lines VALUES(${w}::uuid,${id},'p2',2,2,500,null)`,
        );
        await tx.execute(
          sql`INSERT INTO reservations VALUES(${w}::uuid,${id},'p2','MAIN',2,true)`,
        );
      });
      await send({ action: "SHIP", orderId: id });
      await send({
        action: "CORRECT_MISSING_COST",
        orderId: id,
        productId: "p",
        costTry: 200,
        reason: "İlk maliyet",
      });
      expect((await counts(id)).costs).toBe(0);
      await send({
        action: "CORRECT_MISSING_COST",
        orderId: id,
        productId: "p2",
        costTry: 300,
        reason: "Son maliyet",
      });
      const s = await snapshot(admin),
        o = s.orders.find((o) => o.id === id)!;
      expect(o.lines.every((l) => l.unit_cost_try === null)).toBe(true);
      expect(profitability(o, s.financial)).toMatchObject({
        complete: true,
        cost: 800,
        contribution: 700,
      });
    }, 120000);
    it("reset clears new document/provider/history/correction tables only in its own workspace", async () => {
      const id = await ready();
      await send({
        action: "CREATE_INVENTORY_DOCUMENT",
        kind: "RECEIPT",
        sourceReference: "RESET-REFERENCE",
        sourceOrderId: id,
        reason: "İzole reset testi",
        lines: [{ productId: "p", quantity: 1 }],
      });
      await send({ action: "RESET", confirmation: "SIFIRLA" });
      const s = await snapshot(admin);
      expect(s.workspace.generation).toBe(2);
      expect(s.inventoryDocuments).toHaveLength(0);
      expect(s.integrationEvents).toHaveLength(0);
      expect(s.invoiceEvents).toHaveLength(0);
      expect(s.orders).toHaveLength(263);
      const [untouched] = await rows<{ generation: number }>(
        database(),
        sql`SELECT generation FROM workspaces WHERE id=${other}::uuid`,
      );
      expect(untouched.generation).toBe(1);
    }, 120000);
  },
);
