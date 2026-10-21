import { describe, it, expect } from "vitest";
import { reportData } from "../src/domain/finance/reporting";
import { lineContributions } from "../src/domain/finance/allocation";
import { profitability } from "../src/domain/finance/calculations";
import type {
  WorkspaceSnapshot,
  Order,
  FinancialEntry,
} from "../src/domain/types";
const o = {
  id: "o",
  currency: "RUB",
  status: "RETURNED",
  created_at: "2026-09-30T23:59:59Z",
  fx_rate: 1000000,
  lines: [{ product_id: "p", quantity: 2, unit_price: 100, unit_cost_try: 50 }],
  total: 200,
} as Order;
const f = (kind: string, amount: number, date: string): FinancialEntry => ({
  id: kind,
  order_id: "o",
  kind,
  amount,
  currency: "RUB",
  created_at: date,
});
const entries = [
  f("SALE", 200, "2026-10-01T00:00:00Z"),
  f("COGS", -100, "2026-10-01T00:00:00Z"),
  f("REFUND", -200, "2026-10-02T00:00:00Z"),
  f("COGS_REVERSAL", 100, "2026-10-02T00:00:00Z"),
];
const s = { orders: [o], financial: entries } as WorkspaceSnapshot;
describe("FIN-01 reporting periods", () => {
  it("cohort uses order creation date and all lifetime entries", () => {
    expect(reportData(s, "RUB", "2026-09-30", "2026-09-30").summary.net).toBe(
      0,
    );
    expect(
      reportData(s, "RUB", "2026-10-01", "2026-10-01").orders,
    ).toHaveLength(0);
  });
  it("movement mode separates sale from later refund using UTC boundaries", () => {
    const sale = reportData(s, "RUB", "2026-10-01", "2026-10-01", "MOVEMENT"),
      refund = reportData(s, "RUB", "2026-10-02", "2026-10-02", "MOVEMENT");
    expect(sale.summary.net).toBe(200);
    expect(sale.summary.cost).toBe(100);
    expect(refund.summary.net).toBe(-200);
    expect(refund.summary.cost).toBe(-100);
    expect(
      reportData(s, "TRY", "2026-10-01", "2026-10-02", "MOVEMENT").entries,
    ).toHaveLength(0);
  });
  it("product rows reconcile reversal-only periods exactly", () => {
    const period = entries.slice(2),
      result = lineContributions(o, period)[0];
    expect(result).toMatchObject({ net: -200, cost: -100, contribution: -100 });
    expect(result.contribution).toBe(profitability(o, period).contribution);
  });
  it("separate correction resolves missing cost without changing original line", () => {
    const missing = {
      ...o,
      lines: o.lines.map((l) => ({ ...l, unit_cost_try: null })),
      cost_corrections: { p: 50 },
    };
    expect(profitability(missing, entries).complete).toBe(true);
    expect(missing.lines[0].unit_cost_try).toBeNull();
    expect(lineContributions(missing, entries)[0].cost).toBe(0);
  });
});
