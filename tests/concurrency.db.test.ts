import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { database, pool, rows, sql } from "../src/server/db";
import { execute } from "../src/server/execute";
import { packingLease } from "../src/server/services/packing-leases";
import { snapshot } from "../src/server/snapshot";
import type { Actor } from "../src/domain/types";
import type { Command } from "../src/domain/orders/commands";

const w = randomUUID();
const admin: Actor = { workspaceId: w, userId: "admin", role: "ADMIN" };
const warehouse: Actor = { ...admin, userId: "warehouse", role: "WAREHOUSE" };
const accountant: Actor = {
  ...admin,
  userId: "accountant",
  role: "ACCOUNTANT",
};
const send = (command: Command, actor = admin, key = randomUUID()) =>
  execute(actor, command, key, 1);
async function create(quantity = 1) {
  return (
    await send({
      action: "CREATE_ORDER",
      customer: "Concurrency fixture",
      currency: "TRY",
      fxDate: "2026-10-21",
      fxRate: 1000000,
      commissionBps: 0,
      logistics: 0,
      lines: [{ productId: "p", quantity }],
    })
  ).reference;
}
async function ship(id: string) {
  await send({ action: "RESERVE", orderId: id });
  await send({ action: "SCAN", orderId: id, barcode: "QA-BARCODE" });
  await send({ action: "SHIP", orderId: id });
}
async function state(id: string) {
  const s = await snapshot(admin);
  return {
    s,
    o: s.orders.find((o) => o.id === id)!,
    p: s.products[0],
    ledger: s.ledger.filter((l) => l.reference === id),
    finance: s.financial.filter((f) => f.order_id === id),
  };
}
function oneWinner(results: PromiseSettledResult<unknown>[]) {
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(
    results.length - 1,
  );
}

describe.skipIf(process.env.CONCURRENCY_DB_TEST !== "1")(
  "UX03 concurrent PostgreSQL operators",
  () => {
    beforeAll(async () => {
      await database().transaction(async (tx) => {
        await tx.execute(
          sql`INSERT INTO workspaces(id,name,settings) VALUES(${w}::uuid,'UX03 race fixtures','{"autoDraft":true}')`,
        );
        await tx.execute(
          sql`INSERT INTO users(workspace_id,id,name,role) VALUES(${w}::uuid,'admin','Admin','ADMIN'),(${w}::uuid,'warehouse','Warehouse','WAREHOUSE'),(${w}::uuid,'accountant','Accountant','ACCOUNTANT')`,
        );
        await tx.execute(
          sql`INSERT INTO stores VALUES(${w}::uuid,'ozon-demo','QA')`,
        );
        await tx.execute(
          sql`INSERT INTO warehouses VALUES(${w}::uuid,'MAIN','QA','SELLABLE'),(${w}::uuid,'QUARANTINE','QA QC','QUARANTINE')`,
        );
        await tx.execute(
          sql`INSERT INTO products(workspace_id,id,sku,name,variant,barcode,category,cost_try,price_rub,threshold) VALUES(${w}::uuid,'p','QA-SKU','QA Product','QA','QA-BARCODE','QA',null,500,0)`,
        );
        await tx.execute(
          sql`INSERT INTO stock_ledger VALUES(${w}::uuid,${randomUUID()},'p','MAIN',1000,'OPENING','qa-opening','Fixture','admin',now())`,
        );
      });
    });
    afterAll(async () => {
      try {
        await database().execute(
          sql`DELETE FROM workspaces WHERE id=${w}::uuid`,
        );
      } finally {
        await pool().end();
      }
    });

    it("pins every overlapping transaction to one PostgreSQL backend", async () => {
      await Promise.all(
        Array.from({ length: 8 }, () =>
          database().transaction(async (tx) => {
            const [first] = await rows<{ pid: number }>(
              tx,
              sql`SELECT pg_backend_pid() pid`,
            );
            await tx.execute(sql`SELECT pg_sleep(0.02)`);
            const [last] = await rows<{ pid: number }>(
              tx,
              sql`SELECT pg_backend_pid() pid`,
            );
            expect(last.pid).toBe(first.pid);
          }),
        ),
      );
    });

    it("allows exactly one of two simultaneous terminal claims, without moving stock", async () => {
      const id = await create(),
        before = await state(id);
      const terminals = [randomUUID(), randomUUID()];
      const results = await Promise.allSettled(
        terminals.map((t) => packingLease(warehouse, id, t, "CLAIM", 1)),
      );
      oneWinner(results);
      const status = await Promise.all(
        terminals.map((t) => packingLease(warehouse, id, t, "STATUS", 1)),
      );
      expect(status.filter((s) => s.mine)).toHaveLength(1);
      expect((await state(id)).p.physical).toBe(before.p.physical);
      expect((await state(id)).p.reserved).toBe(before.p.reserved);
      await send({ action: "CANCEL", orderId: id, reason: "Fixture complete" });
    });

    it("expires a lease, rejects stale renewal and allows a different terminal to claim", async () => {
      const id = await create(),
        first = randomUUID(),
        second = randomUUID();
      await packingLease(warehouse, id, first, "CLAIM", 1);
      await database().execute(
        sql`UPDATE packing_claims SET expires_at=now()-interval '1 second' WHERE workspace_id=${w}::uuid AND order_id=${id}`,
      );
      await expect(
        packingLease(warehouse, id, first, "RENEW", 1),
      ).rejects.toMatchObject({ status: 409 });
      expect((await packingLease(warehouse, id, second, "CLAIM", 1)).mine).toBe(
        true,
      );
      await expect(
        packingLease(warehouse, id, first, "RENEW", 1),
      ).rejects.toMatchObject({ status: 409 });
      expect(
        (await packingLease(warehouse, id, first, "RELEASE", 1)).mine,
      ).toBe(false);
      expect(
        (await packingLease(warehouse, id, second, "STATUS", 1)).mine,
      ).toBe(true);
      await send({ action: "CANCEL", orderId: id, reason: "Fixture complete" });
      const claims = await rows(
        database(),
        sql`SELECT * FROM packing_claims WHERE workspace_id=${w}::uuid AND order_id=${id}`,
      );
      expect(claims).toHaveLength(0);
    });

    it("deduplicates concurrent scans with the same key and rejects stale distinct keys", async () => {
      const id = await create(3),
        key = randomUUID();
      await send({ action: "RESERVE", orderId: id });
      const scan: Command = {
        action: "SCAN",
        orderId: id,
        barcode: "QA-BARCODE",
        expectedPackedTotal: 0,
      };
      const replies = await Promise.all([
        send(scan, admin, key),
        send(scan, warehouse, key),
      ]);
      expect(replies[0]).toEqual(replies[1]);
      expect((await state(id)).o.lines[0].packed).toBe(1);
      oneWinner(
        await Promise.allSettled([
          send({ ...scan, expectedPackedTotal: 1 }, admin),
          send({ ...scan, expectedPackedTotal: 1 }, warehouse),
        ]),
      );
      expect((await state(id)).o.lines[0].packed).toBe(2);
      expect((await state(id)).ledger).toHaveLength(0);
      await send({ action: "CANCEL", orderId: id, reason: "Fixture complete" });
    });

    it("concurrent shipment retries debit stock, finance, providers and invoice exactly once", async () => {
      const id = await create();
      await send({ action: "RESERVE", orderId: id });
      await send({ action: "SCAN", orderId: id, barcode: "QA-BARCODE" });
      const before = await state(id);
      await Promise.all(
        Array.from({ length: 6 }, (_, n) =>
          send({ action: "SHIP", orderId: id }, n % 2 ? warehouse : admin),
        ),
      );
      const after = await state(id);
      expect(after.p.physical).toBe(before.p.physical - 1);
      expect(after.p.reserved).toBe(before.p.reserved - 1);
      expect(after.ledger.filter((l) => l.kind === "SHIPMENT")).toHaveLength(1);
      expect(after.finance.filter((f) => f.kind === "SALE")).toHaveLength(1);
      expect(after.s.invoices.filter((i) => i.order_id === id)).toHaveLength(1);
      expect(
        after.s.integrationEvents!.filter((e) => e.order_id === id),
      ).toHaveLength(2);
    });

    it("concurrent contradictory QC decisions preserve one decision and one refund", async () => {
      for (let n = 0; n < 6; n++) {
        const id = await create();
        await ship(id);
        await Promise.all([
          send({ action: "RETURN", orderId: id, reason: "QA return" }),
          send(
            { action: "RETURN", orderId: id, reason: "QA return" },
            warehouse,
          ),
        ]);
        const before = await state(id);
        await Promise.all([
          send(
            {
              action: "QC",
              orderId: id,
              accept: n % 2 === 0,
              reason: "First QC",
            },
            warehouse,
          ),
          send({
            action: "QC",
            orderId: id,
            accept: n % 2 !== 0,
            reason: "Second QC",
          }),
        ]);
        const after = await state(id),
          decision = after.s.returns.find((r) => r.order_id === id)!;
        expect(["ACCEPTED", "REJECTED"]).toContain(decision.status);
        expect(after.p.quarantine).toBe(before.p.quarantine - 1);
        expect(after.p.physical).toBe(
          before.p.physical + (decision.status === "ACCEPTED" ? 1 : 0),
        );
        expect(
          after.ledger.filter(
            (l) => l.warehouse_id === "QUARANTINE" && l.quantity < 0,
          ),
        ).toHaveLength(1);
        expect(after.finance.filter((f) => f.kind === "REFUND")).toHaveLength(
          1,
        );
      }
    });

    it("competing cost completions keep one immutable correction and one COGS entry", async () => {
      const id = await create();
      await ship(id);
      const command: Command = {
        action: "CORRECT_MISSING_COST",
        orderId: id,
        productId: "p",
        costTry: 200,
        reason: "QA supplier cost",
      };
      oneWinner(
        await Promise.allSettled([
          send(command),
          send({ ...command, costTry: 300 }, accountant),
        ]),
      );
      const after = await state(id),
        cost = after.o.cost_corrections!.p;
      expect([200, 300]).toContain(cost);
      expect(after.o.lines[0].unit_cost_try).toBeNull();
      expect(
        after.finance.filter((f) => f.kind === "COGS").map((f) => f.amount),
      ).toEqual([-cost]);
    });

    it("cost completion racing accepted QC always balances cost and reversal", async () => {
      for (let n = 0; n < 6; n++) {
        const id = await create();
        await ship(id);
        await send({ action: "RETURN", orderId: id, reason: "QA return" });
        const operations: [Command, Actor][] = [
          [
            {
              action: "CORRECT_MISSING_COST",
              orderId: id,
              productId: "p",
              costTry: 250,
              reason: "QA supplier cost",
            },
            accountant,
          ],
          [
            { action: "QC", orderId: id, accept: true, reason: "QA accepted" },
            warehouse,
          ],
        ];
        if (n % 2) operations.reverse();
        await Promise.all(operations.map(([c, a]) => send(c, a)));
        const after = await state(id);
        expect(after.o.lines[0].unit_cost_try).toBeNull();
        expect(
          after.finance.filter((f) => f.kind === "COGS").map((f) => f.amount),
        ).toEqual([-250]);
        expect(
          after.finance
            .filter((f) => f.kind === "COGS_REVERSAL")
            .map((f) => f.amount),
        ).toEqual([250]);
        expect(after.p.quarantine).toBe(0);
      }
    });
  },
);
