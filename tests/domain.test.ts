import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { database, sql, pool, transaction } from "../src/server/db";
import { seed } from "../src/server/seed";
import { execute } from "../src/server/execute";
import { packingLease } from "../src/server/services/packing-leases";
import { snapshot } from "../src/server/snapshot";
import {
  financialSummary,
  profitability,
} from "../src/domain/finance/calculations";
import { DemoParasutAdapter } from "../src/domain/integrations/adapters";
import type { Actor, Order, Product } from "../src/domain/types";
import type { Command } from "../src/domain/orders/commands";
// Load the test-only local connection without committing credentials.
for (const line of (existsSync(".env.local")
  ? readFileSync(".env.local", "utf8")
  : ""
).split("\n")) {
  const idx = line.indexOf("=");
  if (idx > 0 && !process.env[line.slice(0, idx)])
    process.env[line.slice(0, idx)] = line.slice(idx + 1);
}
const w = randomUUID(),
  other = randomUUID(),
  admin: Actor = { workspaceId: w, userId: "admin", role: "ADMIN" };
const warehouse: Actor = { ...admin, userId: "warehouse", role: "WAREHOUSE" },
  accountant: Actor = { ...admin, userId: "accountant", role: "ACCOUNTANT" };
const run = (
  command: Command,
  actor = admin,
  key = randomUUID(),
  generation = 1,
) => execute(actor, command, key, generation);
async function create(productId = "p2", quantity = 1) {
  return (
    await run({
      action: "CREATE_ORDER",
      customer: "Test alıcı",
      currency: "RUB",
      fxDate: "2026-10-20",
      fxRate: 485000,
      commissionBps: 1500,
      logistics: 25000,
      lines: [{ productId, quantity }],
    })
  ).reference;
}
async function current(id: string): Promise<Order> {
  return (await snapshot(admin)).orders.find((o) => o.id === id)!;
}
async function product(id = "p2"): Promise<Product> {
  return (await snapshot(admin)).products.find((p) => p.id === id)!;
}
async function ship(id: string) {
  await run({ action: "RESERVE", orderId: id });
  const o = await current(id),
    s = await snapshot(admin);
  for (const l of o.lines)
    for (let i = 0; i < l.quantity; i++)
      await run({
        action: "SCAN",
        orderId: id,
        barcode: s.products.find((p) => p.id === l.product_id)!.barcode,
      });
  await run({ action: "SHIP", orderId: id });
}
beforeAll(async () => {
  for (const id of [w, other])
    await database().transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO workspaces(id,name) VALUES(${id}::uuid,'Test')`,
      );
      await tx.execute(
        sql`INSERT INTO users(workspace_id,id,name,role) VALUES(${id}::uuid,'admin','Test admin','ADMIN'),(${id}::uuid,'warehouse','Test depo','WAREHOUSE'),(${id}::uuid,'accountant','Test muhasebe','ACCOUNTANT')`,
      );
      await seed(tx, id);
    });
});
afterAll(async () => {
  for (const id of [w, other])
    await database().execute(sql`DELETE FROM workspaces WHERE id=${id}::uuid`);
  await pool().end();
});
describe("PostgreSQL domain invariants", () => {
  it("enforces terminal ownership, supervisor takeover and release under workspace lock", async () => {
    const id = await create("p2", 2);
    const first = randomUUID(), second = randomUUID();
    await expect(
      packingLease(accountant, id, first, "CLAIM", 1),
    ).rejects.toThrow("yetkiniz");
    await expect(
      packingLease({ ...warehouse, workspaceId: other }, id, first, "CLAIM", 1),
    ).rejects.toThrow("bulunamadı");
    expect((await packingLease(warehouse, id, first, "CLAIM", 1)).mine).toBe(true);
    await expect(packingLease(warehouse, id, second, "CLAIM", 1)).rejects.toThrow("başka");
    await expect(packingLease(warehouse, id, second, "TAKE_OVER", 1)).rejects.toThrow("yönetici");
    await expect(run({ action: "RESERVE", orderId: id }, warehouse)).rejects.toThrow("terminalinde");
    await run({ action: "RESERVE", orderId: id, terminalId: first }, warehouse);
    const code = (await product("p2")).barcode;
    await expect(run({ action: "SCAN", orderId: id, barcode: code, terminalId: second }, warehouse))
      .rejects.toThrow("terminalinde");
    expect((await current(id)).lines[0].packed).toBe(0);
    expect((await packingLease(admin, id, second, "TAKE_OVER", 1)).mine).toBe(true);
    await expect(run({ action: "SCAN", orderId: id, barcode: code, terminalId: first }, warehouse))
      .rejects.toThrow("terminalinde");
    await run({ action: "SCAN", orderId: id, barcode: code, terminalId: second }, admin);
    await packingLease(admin, id, second, "RELEASE", 1);
    expect((await packingLease(warehouse, id, first, "CLAIM", 1)).mine).toBe(true);
    await run({ action: "SCAN", orderId: id, barcode: code, terminalId: first }, warehouse);
    await run({ action: "SHIP", orderId: id, terminalId: first }, warehouse);
    expect((await packingLease(warehouse, id, first, "STATUS", 1)).mine).toBe(false);
  });

  it("rejects stale two-tab barcode scans under the workspace transaction lock", async () => {
    const id = await create("p2", 2);
    await run({ action: "RESERVE", orderId: id });
    const barcode = (await product("p2")).barcode;
    const attempts = await Promise.allSettled([
      run(
        { action: "SCAN", orderId: id, barcode, expectedPackedTotal: 0 },
        admin,
      ),
      run(
        { action: "SCAN", orderId: id, barcode, expectedPackedTotal: 0 },
        warehouse,
      ),
    ]);
    expect(
      attempts.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const partial = await current(id);
    expect(partial.lines[0].packed).toBe(1);
    expect(partial.status).toBe("PACKING");
    await run(
      { action: "SCAN", orderId: id, barcode, expectedPackedTotal: 1 },
      warehouse,
    );
    expect((await current(id)).status).toBe("READY");
    await run({
      action: "CANCEL",
      orderId: id,
      reason: "İki sekme testi tamamlandı",
    });
  });

  it("demo seed has 78 products, 263 orders and no negative availability", async () => {
    const s = await snapshot(admin);
    expect(s.products).toHaveLength(78);
    expect(s.orders).toHaveLength(263);
    expect(s.products.every((p) => p.available >= 0 && p.quarantine >= 0)).toBe(
      true,
    );
    for (const o of s.orders)
      expect(o.total).toBe(
        o.lines.reduce((n, l) => n + l.quantity * l.unit_price, 0),
      );
  });
  it("reservation does not reduce physical stock; repeating does not reserve twice", async () => {
    const id = await create(),
      before = await product();
    await run({ action: "RESERVE", orderId: id });
    await run({ action: "RESERVE", orderId: id });
    const after = await product();
    expect(after.physical).toBe(before.physical);
    expect(after.reserved).toBe(before.reserved + 1);
    await run({ action: "CANCEL", orderId: id, reason: "Test tamamlandı" });
  });
  it("shipment debits once, releases reservation, records finance and history", async () => {
    const id = await create("p2", 2),
      before = await product();
    await ship(id);
    await run({ action: "SHIP", orderId: id });
    const s = await snapshot(admin),
      after = s.products.find((p) => p.id === "p2")!;
    expect(after.physical).toBe(before.physical - 2);
    expect(after.reserved).toBe(before.reserved);
    expect(
      s.ledger.filter((l) => l.reference === id && l.kind === "SHIPMENT"),
    ).toHaveLength(1);
    expect(
      s.financial.filter((f) => f.order_id === id && f.kind === "SALE"),
    ).toHaveLength(1);
    expect(s.audit.some((e) => e.reference === id && e.action === "SHIP")).toBe(
      true,
    );
  });
  it("late finance failure rolls back shipment, stock, receipt and audit together", async () => {
    const id = await create("p2", 2);
    await run({ action: "RESERVE", orderId: id });
    for (let i = 0; i < 2; i++)
      await run({
        action: "SCAN",
        orderId: id,
        barcode: (await product()).barcode,
      });
    // Valid integer line price, but a total beyond the SQL ledger integer range.
    // This fails after stock, reservation and shipment writes have already run.
    await transaction(w, async (tx) => {
      await tx.execute(
        sql`UPDATE order_lines SET unit_price=2147483647 WHERE workspace_id=${w}::uuid AND order_id=${id}`,
      );
    });
    const before = await product();
    const key = randomUUID();
    await expect(
      run({ action: "SHIP", orderId: id }, admin, key),
    ).rejects.toThrow();
    const s = await snapshot(admin);
    expect((await current(id)).status).toBe("READY");
    expect(await product()).toMatchObject({
      physical: before.physical,
      reserved: before.reserved,
    });
    expect(s.ledger.filter((l) => l.reference === id)).toHaveLength(0);
    expect(s.financial.filter((f) => f.order_id === id)).toHaveLength(0);
    expect(s.invoices.filter((i) => i.order_id === id)).toHaveLength(0);
    expect(
      s.audit.filter((e) => e.reference === id && e.action === "SHIP"),
    ).toHaveLength(0);
    const state = await database().execute(sql`SELECT
      (SELECT count(*)::int FROM shipments WHERE workspace_id=${w}::uuid AND order_id=${id}) AS shipments,
      (SELECT count(*)::int FROM command_receipts WHERE workspace_id=${w}::uuid AND key=${key}) AS receipts`);
    expect(state.rows[0]).toEqual({ shipments: 0, receipts: 0 });
    await transaction(w, async (tx) => {
      await tx.execute(
        sql`UPDATE order_lines SET unit_price=1000 WHERE workspace_id=${w}::uuid AND order_id=${id}`,
      );
    });
    // A rolled-back request key can safely complete after correcting the cause.
    await run({ action: "SHIP", orderId: id }, admin, key);
    expect((await current(id)).status).toBe("SHIPPED");
    expect((await product()).physical).toBe(before.physical - 2);
  });
  it("cancel releases reservations and never creates stock ledger entries", async () => {
    const id = await create(),
      before = await product();
    await run({ action: "RESERVE", orderId: id });
    await run({ action: "CANCEL", orderId: id, reason: "Test iptali" });
    await run({ action: "CANCEL", orderId: id, reason: "Test iptali" });
    const s = await snapshot(admin);
    expect((await product()).physical).toBe(before.physical);
    expect((await product()).reserved).toBe(before.reserved);
    expect(s.ledger.filter((l) => l.reference === id)).toHaveLength(0);
  });
  it("insufficient stock rolls back all reservation lines; unreserved packing blocked", async () => {
    const id = await create("p2", 1000);
    await expect(run({ action: "RESERVE", orderId: id })).rejects.toThrow(
      "Yetersiz",
    );
    await expect(
      run({ action: "SCAN", orderId: id, barcode: "8690100000002" }),
    ).rejects.toThrow("Önce");
    expect((await current(id)).status).toBe("NEW");
  });
  it("concurrent reservations cannot oversell the same SKU", async () => {
    await transaction(w, async (tx) => {
      await tx.execute(
        sql`INSERT INTO products VALUES(${w}::uuid,'ptest','TEST-ONLY','Test ürün','Test','TEST-BARCODE','Test',100,1000,0)`,
      );
      await tx.execute(
        sql`INSERT INTO stock_ledger VALUES(${w}::uuid,${randomUUID()},'ptest','MAIN',3,'OPENING','TEST-OPEN','Test','admin',now())`,
      );
    });
    const a = await create("ptest", 2),
      b = await create("ptest", 2);
    const results = await Promise.allSettled([
      run({ action: "RESERVE", orderId: a }),
      run({ action: "RESERVE", orderId: b }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const p = await product("ptest");
    expect(p.available).toBe(1);
    expect(p.physical).toBe(3);
  });
  it("idempotency key prevents duplicate scans and rejects conflicting payloads", async () => {
    const id = await create("p2", 2);
    await run({ action: "RESERVE", orderId: id });
    const key = randomUUID(),
      command: Command = {
        action: "SCAN",
        orderId: id,
        barcode: (await product()).barcode,
      };
    await run(command, admin, key);
    await run(command, admin, key);
    expect((await current(id)).lines[0].packed).toBe(1);
    await expect(
      run({ action: "SHIP", orderId: id }, admin, key),
    ).rejects.toThrow("anahtarı");
    await expect(run({ action: "SHIP", orderId: id })).rejects.toThrow(
      "doğrulamadan",
    );
  });
  it("return is quarantined until QC; repeated QC cannot credit twice", async () => {
    const id = await create();
    await ship(id);
    const before = await product();
    await run({ action: "RETURN", orderId: id, reason: "Demo iade" });
    const pending = await product();
    expect(pending.available).toBe(before.available);
    expect(pending.quarantine).toBe(before.quarantine + 1);
    await run({
      action: "QC",
      orderId: id,
      accept: true,
      reason: "Kontrol başarılı",
    });
    await run({
      action: "QC",
      orderId: id,
      accept: true,
      reason: "Kontrol başarılı",
    });
    const after = await product();
    expect(after.physical).toBe(before.physical + 1);
    expect(after.quarantine).toBe(before.quarantine);
  });
  it("failed QC keeps stock out of sale and retains cost loss", async () => {
    const id = await create();
    await ship(id);
    const before = await product();
    await run({ action: "RETURN", orderId: id, reason: "Hasarlı iade" });
    await run({
      action: "QC",
      orderId: id,
      accept: false,
      reason: "Ürün hasarlı",
    });
    expect((await product()).physical).toBe(before.physical);
    const s = await snapshot(admin);
    expect(
      s.financial.filter(
        (f) => f.order_id === id && f.kind === "COGS_REVERSAL",
      ),
    ).toHaveLength(0);
  });
  it("invoice remains DEMO / TASLAK and live electronic invoicing disabled", async () => {
    const id = await create();
    await ship(id);
    await run({ action: "INVOICE", orderId: id }, accountant);
    await run({ action: "INVOICE", orderId: id }, accountant);
    const s = await snapshot(admin);
    expect(s.invoices.filter((i) => i.order_id === id)).toHaveLength(1);
    expect(s.invoices.find((i) => i.order_id === id)?.label).toBe(
      "DEMO / TASLAK",
    );
    await expect(
      new DemoParasutAdapter().sendElectronicInvoice(),
    ).rejects.toThrow("kapalı");
  });
  it("financial report reconciles to shipped order amounts; unknown costs suppress profit", async () => {
    const s = await snapshot(admin);
    for (const currency of ["RUB", "TRY"] as const) {
      const f = financialSummary(s.financial, currency);
      const shipped = s.orders.filter(
        (o) =>
          o.currency === currency &&
          ["SHIPPED", "RETURN_PENDING", "RETURNED"].includes(o.status),
      );
      expect(f.gross).toBe(shipped.reduce((n, o) => n + o.total, 0));
      expect(f.net).toBe(f.gross - f.refunds);
    }
    const unknown = s.orders.find((o) =>
      o.lines.some((l) => l.unit_cost_try === null),
    )!;
    expect(profitability(unknown, s.financial).contribution).toBeNull();
  });
  it("server roles are re-read; warehouse cannot draft invoices or create orders", async () => {
    await expect(createForWarehouse()).rejects.toThrow("yetkiniz");
    const id = await create();
    await expect(
      run({ action: "INVOICE", orderId: id }, warehouse),
    ).rejects.toThrow("yetkiniz");
    await run({
      action: "PRODUCT",
      productId: "p2",
      costTry: 12345,
      threshold: 12,
    });
    const s = await snapshot(warehouse);
    expect(s.audit.some((e) => e.action === "PRODUCT")).toBe(false);
    expect(s.financial).toEqual([]);
    expect(s.products.every((p) => p.cost_try === null)).toBe(true);
    await expect(
      run(
        { action: "ADJUST", productId: "p2", quantity: 1, reason: "Test" },
        accountant,
      ),
    ).rejects.toThrow("yetkiniz");
  });
  it("workspace isolation prevents cross-tenant access", async () => {
    const id = await create();
    await expect(
      run(
        { action: "RESERVE", orderId: id },
        { workspaceId: other, userId: "admin", role: "ADMIN" },
      ),
    ).rejects.toThrow("bulunamadı");
    const before = (
      await snapshot({ ...admin, workspaceId: other })
    ).products.find((p) => p.id === "p2")!.physical;
    await run({
      action: "ADJUST",
      productId: "p2",
      quantity: 7,
      reason: "İzolasyon testi",
    });
    expect(
      (await snapshot({ ...admin, workspaceId: other })).products.find(
        (p) => p.id === "p2",
      )!.physical,
    ).toBe(before);
  });
  it("FBO workflow is blocked rather than pretending live fulfillment", async () => {
    const id = (await snapshot(admin)).orders.find(
      (o) => o.fulfillment === "FBO",
    )!.id;
    await expect(run({ action: "RESERVE", orderId: id })).rejects.toThrow(
      "FBO",
    );
  });
  it("reset is scoped, atomic and rejects stale generations", async () => {
    const before = (await snapshot({ ...admin, workspaceId: other })).orders
      .length;
    await run({ action: "RESET", confirmation: "SIFIRLA" });
    const s = await snapshot(admin);
    expect(s.orders).toHaveLength(263);
    expect(s.products).toHaveLength(78);
    expect(s.workspace.generation).toBe(2);
    expect(
      (await snapshot({ ...admin, workspaceId: other })).orders,
    ).toHaveLength(before);
    await expect(
      run({ action: "RESERVE", orderId: s.orders[1].id }),
    ).rejects.toThrow("sıfırlandı");
  });
});
function createForWarehouse() {
  return run(
    {
      action: "CREATE_ORDER",
      customer: "Test",
      currency: "RUB",
      fxDate: "2026-10-20",
      fxRate: 485000,
      commissionBps: 1500,
      logistics: 25000,
      lines: [{ productId: "p2", quantity: 1 }],
    },
    warehouse,
  );
}
