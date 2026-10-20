import { it, expect } from "vitest";
import { allocate, lineContributions } from "../src/domain/finance/allocation";
import type { Order, FinancialEntry } from "../src/domain/types";
it("allocates integer fees without losing or creating minor units", () => {
  expect(allocate(101, [1, 1, 1])).toEqual([34, 34, 33]);
  expect(allocate(-101, [1, 1, 1])).toEqual([-34, -34, -33]);
});
it("product contribution uses each product actual cost and reconciles to order", () => {
  const order = {
    id: "test",
    currency: "TRY",
    fx_rate: 500000,
    lines: [
      { product_id: "a", quantity: 1, unit_price: 10000, unit_cost_try: 1000 },
      { product_id: "b", quantity: 1, unit_price: 10000, unit_cost_try: 8000 },
    ],
  } as Order;
  const entries = [
    { kind: "SALE", amount: 20000 },
    { kind: "COMMISSION", amount: -2000 },
    { kind: "LOGISTICS", amount: -1001 },
    { kind: "COGS", amount: -9000 },
  ].map((e) => ({
    ...e,
    order_id: "test",
    currency: "TRY",
  })) as FinancialEntry[];
  const rows = lineContributions(order, entries);
  expect(rows[0].contribution).toBe(7499);
  expect(rows[1].contribution).toBe(500);
  expect(rows.reduce((s, r) => s + r.contribution!, 0)).toBe(7999);
});
