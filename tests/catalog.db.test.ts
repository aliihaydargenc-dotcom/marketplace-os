import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { database, rows, sql, pool } from "../src/server/db";
import { execute } from "../src/server/execute";
import { snapshot } from "../src/server/snapshot";
import type { Actor, Product } from "../src/domain/types";
import type { Command } from "../src/domain/orders/commands";
const w = randomUUID(),
  other = randomUUID();
const admin: Actor = { workspaceId: w, userId: "admin", role: "ADMIN" };
const send = (command: Command, key = randomUUID(), actor = admin) =>
  execute(actor, command, key, 1);
let seq = 0;
async function create() {
  const n = ++seq;
  const fields = {
    sku: `TEST-${n}`,
    name: "Test havlu",
    variant: "Standart",
    barcode: `DEMO-TEST-${n}`,
    category: "Tekstil",
    priceRub: 100000,
    costTry: 12000,
    threshold: 3,
    active: true,
  };
  const result = await send({ action: "CREATE_PRODUCT", ...fields });
  return { id: result.reference, fields };
}
async function product(id: string) {
  const [p] = await rows<Product>(
    database(),
    sql`SELECT * FROM products WHERE workspace_id=${w}::uuid AND id=${id}`,
  );
  return p;
}
async function order(pid: string) {
  return send({
    action: "CREATE_ORDER",
    customer: "Kurgusal test alıcısı",
    currency: "RUB",
    fxRate: 500000,
    fxDate: "2026-10-21",
    commissionBps: 1500,
    logistics: 25000,
    lines: [{ productId: pid, quantity: 1 }],
  });
}
describe.skipIf(process.env.CATALOG_DB_TEST !== "1")(
  "catalog PostgreSQL integrity",
  () => {
    beforeAll(async () => {
      for (const id of [w, other]) {
        await database().execute(
          sql`INSERT INTO workspaces(id,name) VALUES(${id}::uuid,'CAT-01 isolated test')`,
        );
        await database().execute(
          sql`INSERT INTO users(workspace_id,id,name,role) VALUES(${id}::uuid,'admin','Test admin','ADMIN'),(${id}::uuid,'warehouse','Test depo','WAREHOUSE')`,
        );
        await database().execute(
          sql`INSERT INTO stores VALUES(${id}::uuid,'ozon-demo','Test store')`,
        );
        await database().execute(
          sql`INSERT INTO warehouses VALUES(${id}::uuid,'MAIN','Test main','SELLABLE'),(${id}::uuid,'QUARANTINE','Test QC','QUARANTINE'),(${id}::uuid,'FBO','FBO reference','FBO_REFERENCE')`,
        );
      }
    });
    afterAll(async () => {
      await database().execute(
        sql`DELETE FROM workspaces WHERE id IN (${w}::uuid,${other}::uuid)`,
      );
      await pool().end();
    });
    it("creates at zero stock, idempotent retries return the same product", async () => {
      const key = randomUUID(),
        c: Command = {
          action: "CREATE_PRODUCT",
          sku: "IDEMPOTENT",
          name: "Yeni havlu",
          variant: "Mavi",
          barcode: "DEMO-IDEMPOTENT",
          category: "Tekstil",
          priceRub: 100000,
          costTry: null,
          threshold: 3,
          active: true,
        };
      const a = await send(c, key),
        b = await send(c, key);
      expect(a).toEqual(b);
      const p = (await snapshot(admin)).products.find(
        (p) => p.id === a.reference,
      )!;
      expect(p.physical).toBe(0);
      expect(p.active).toBe(true);
      expect(p.catalog_version).toBe(0);
    });
    it("enforces SKU/barcode uniqueness within each workspace", async () => {
      const p = await create();
      await expect(
        send({
          action: "CREATE_PRODUCT",
          ...p.fields,
          sku: p.fields.sku.toLowerCase(),
          barcode: "other-barcode",
        }),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        send({ action: "CREATE_PRODUCT", ...p.fields, sku: "OTHER-SKU" }),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        send({ action: "CREATE_PRODUCT", ...p.fields }, randomUUID(), {
          ...admin,
          workspaceId: other,
        }),
      ).resolves.toHaveProperty("reference");
    });
    it("allows unused identity edits and rejects stale edits / cross-workspace targets", async () => {
      const p = await create();
      await send({
        action: "UPDATE_CATALOG",
        productId: p.id,
        version: 0,
        ...p.fields,
        name: "Düzeltilmiş havlu",
      });
      expect((await product(p.id)).name).toBe("Düzeltilmiş havlu");
      await expect(
        send({
          action: "UPDATE_CATALOG",
          productId: p.id,
          version: 0,
          ...p.fields,
        }),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        send(
          {
            action: "UPDATE_CATALOG",
            productId: p.id,
            version: 1,
            ...p.fields,
          },
          randomUUID(),
          { ...admin, workspaceId: other },
        ),
      ).rejects.toMatchObject({ status: 404 });
    });
    it("preserves used identity and order price/cost while preventing new orders for inactive products", async () => {
      const p = await create(),
        o = await order(p.id);
      await expect(
        send({
          action: "UPDATE_CATALOG",
          productId: p.id,
          version: 0,
          ...p.fields,
          barcode: "CHANGED",
        }),
      ).rejects.toMatchObject({ status: 409 });
      await send({
        action: "UPDATE_CATALOG",
        productId: p.id,
        version: 0,
        ...p.fields,
        priceRub: 200000,
        costTry: 50000,
        active: false,
      });
      const [line] = await rows<{ unit_price: number; unit_cost_try: number }>(
        database(),
        sql`SELECT unit_price,unit_cost_try FROM order_lines WHERE workspace_id=${w}::uuid AND order_id=${o.reference}`,
      );
      expect(line).toMatchObject({ unit_price: 100000, unit_cost_try: 12000 });
      await expect(order(p.id)).rejects.toMatchObject({ status: 409 });
      await send({
        action: "ADJUST",
        productId: p.id,
        quantity: 2,
        reason: "Test reference stock",
      });
      await send({ action: "RESERVE", orderId: o.reference });
      await send({
        action: "SCAN",
        orderId: o.reference,
        barcode: p.fields.barcode,
      });
      await send({ action: "SHIP", orderId: o.reference });
      expect(
        (await snapshot(admin)).orders.find((x) => x.id === o.reference)
          ?.status,
      ).toBe("SHIPPED");
    });
    it("rejects warehouse mutations and tracks legacy card edits in the version", async () => {
      const p = await create();
      await expect(
        send(
          {
            action: "UPDATE_CATALOG",
            productId: p.id,
            version: 0,
            ...p.fields,
          },
          randomUUID(),
          { ...admin, userId: "warehouse", role: "WAREHOUSE" },
        ),
      ).rejects.toMatchObject({ status: 403 });
      await send({
        action: "PRODUCT",
        productId: p.id,
        costTry: 12345,
        threshold: 5,
      });
      expect((await product(p.id)).catalog_version).toBe(1);
    });
    it("imports six references, three NEW demo orders and one opening per SKU only once", async () => {
      await send({ action: "IMPORT_OZON_DEMO" });
      await send({ action: "IMPORT_OZON_DEMO" });
      const s = await snapshot(admin),
        refs = s.products.filter((p) => p.source?.provider === "OZON_PUBLIC");
      expect(refs).toHaveLength(6);
      expect(refs.every((p) => p.physical === 12 && p.reserved === 0)).toBe(
        true,
      );
      expect(
        s.orders.filter((o) => o.number.startsWith("DEMO-OZON-")),
      ).toHaveLength(3);
      expect(
        s.ledger.filter((l) => l.reference === "OZON-PUBLIC-V1"),
      ).toHaveLength(6);
      const target = s.orders.find((o) => o.number === "DEMO-OZON-001")!;
      await send({ action: "RESERVE", orderId: target.id });
      for (const l of target.lines) {
        const p = refs.find((p) => p.id === l.product_id)!;
        await send({ action: "SCAN", orderId: target.id, barcode: p.barcode });
      }
      await send({ action: "SHIP", orderId: target.id });
      const after = await snapshot(admin);
      expect(
        after.financial.filter(
          (f) => f.order_id === target.id && f.kind === "SALE",
        ),
      ).toHaveLength(1);
      expect(
        after.products.find((p) => p.id === target.lines[0].product_id)
          ?.physical,
      ).toBe(11);
    });
    it("fresh seed contains references and reset generation invalidates stale clients", async () => {
      await send({ action: "RESET", confirmation: "SIFIRLA" });
      const s = await snapshot(admin);
      expect(s.products).toHaveLength(78);
      expect(s.orders).toHaveLength(263);
      expect(
        s.products.filter((p) => p.source?.provider === "OZON_PUBLIC"),
      ).toHaveLength(6);
      expect(s.workspace.generation).toBe(2);
      await expect(send({ action: "IMPORT_OZON_DEMO" })).rejects.toMatchObject({
        status: 409,
      });
    });
  },
);
