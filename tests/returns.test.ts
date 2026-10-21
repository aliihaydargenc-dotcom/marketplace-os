import { describe, it, expect } from "vitest";
import {
  returnQueue,
  returnDecisionBlock,
  waitingHours,
} from "../src/domain/inventory/returns";
import type { Product, Order, ReturnRecord, Ledger } from "../src/domain/types";
const p: Product = {
  id: "p",
  sku: "H-1",
  name: "İnce havlu",
  variant: "Mavi",
  barcode: "869001",
  category: "Tekstil",
  cost_try: 100,
  price_rub: 200,
  threshold: 1,
  physical: 5,
  reserved: 1,
  available: 4,
  quarantine: 9,
};
function order(id: string): Order {
  return {
    id,
    number: `DEMO-${id}`,
    customer: "Kurgusal alıcı",
    fulfillment: "FBS",
    status: "RETURN_PENDING",
    currency: "RUB",
    created_at: "2026-10-01T10:00:00Z",
    shipped_at: "2026-10-02T10:00:00Z",
    fx_date: "2026-10-01",
    fx_rate: 500000,
    commission_bps: 1500,
    logistics: 25000,
    total: 400,
    lines: [
      {
        order_id: id,
        product_id: "p",
        quantity: 2,
        packed: 2,
        unit_price: 200,
        unit_cost_try: 100,
      },
    ],
  };
}
const record = (
  id: string,
  status: ReturnRecord["status"] = "PENDING",
  day = "20",
): ReturnRecord => ({
  order_id: id,
  status,
  reason: "Ambalaj kontrolü",
  created_at: `2026-10-${day}T10:00:00Z`,
  reviewed_at: status === "PENDING" ? null : "2026-10-21T09:00:00Z",
});
const ledger = (ref: string, q: number): Ledger => ({
  id: ref,
  product_id: "p",
  warehouse_id: "QUARANTINE",
  quantity: q,
  kind: "RETURN_RECEIPT",
  reference: ref,
  reason: "Demo",
  actor: "seed",
  created_at: "2026-10-20T10:00:00Z",
});
describe("returns workbench read model", () => {
  it("separates statuses, excludes FBO/orphan records and sorts oldest first immutably", () => {
    const returns = [
      record("b"),
      record("a", "PENDING", "19"),
      record("done", "ACCEPTED"),
      record("no", "REJECTED"),
      record("fbo"),
      record("missing"),
    ];
    const orders = [
      order("b"),
      order("a"),
      { ...order("done"), status: "RETURNED" as const },
      { ...order("no"), status: "RETURNED" as const },
      { ...order("fbo"), fulfillment: "FBO" as const },
    ];
    expect(
      returnQueue(returns, orders, [p], "PENDING").map((i) => i.order.id),
    ).toEqual(["a", "b"]);
    expect(returns[0].order_id).toBe("b");
    expect(returnQueue(returns, orders, [p], "ACCEPTED")).toHaveLength(1);
    expect(returnQueue(returns, orders, [p], "REJECTED")).toHaveLength(1);
    expect(returnQueue(returns, orders, [p], "ALL")).toHaveLength(4);
  });
  it("searches Turkish names, SKU, barcode and reasons within the selected lane", () => {
    for (const query of ["İNCE", "H-1", "869001", "AMBALAJ", "DEMO-a"])
      expect(
        returnQueue([record("a")], [order("a")], [p], "PENDING", query),
      ).toHaveLength(1);
    expect(
      returnQueue(
        [record("a", "ACCEPTED")],
        [order("a")],
        [p],
        "PENDING",
        "869001",
      ),
    ).toHaveLength(0);
  });
  it("only enables decisions when own return ledger matches every line, never global quarantine", () => {
    const item = { record: record("a"), order: order("a") };
    expect(returnDecisionBlock(item, [p], [ledger("a", 2)])).toBeNull();
    expect(returnDecisionBlock(item, [p], [ledger("other", 2)])).not.toBeNull();
    expect(returnDecisionBlock(item, [p], [ledger("a", 1)])).not.toBeNull();
    expect(returnDecisionBlock(item, [], [ledger("a", 2)])).not.toBeNull();
    expect(
      returnDecisionBlock(
        { ...item, record: record("a", "ACCEPTED") },
        [p],
        [ledger("a", 2)],
      ),
    ).not.toBeNull();
    expect(
      returnDecisionBlock(
        { ...item, order: { ...item.order, status: "SHIPPED" } },
        [p],
        [ledger("a", 2)],
      ),
    ).not.toBeNull();
  });
  it("computes nonnegative completed-hour waiting age at the explicit snapshot time", () => {
    expect(waitingHours(record("a"), Date.parse("2026-10-21T10:30:00Z"))).toBe(
      24,
    );
    expect(waitingHours(record("a"), Date.parse("2026-10-19T10:00:00Z"))).toBe(
      0,
    );
  });
});
