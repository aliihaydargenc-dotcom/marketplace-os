import type { FinancialEntry, Order } from "../types";
export function costInOrderCurrency(
  costTry: number,
  order: Pick<Order, "currency" | "fx_rate">,
) {
  return order.currency === "TRY"
    ? costTry
    : Math.round((costTry * 1000000) / order.fx_rate);
}
export function orderTotal(order: Order) {
  return order.lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
}
export function financialSummary(
  entries: FinancialEntry[],
  currency: "RUB" | "TRY",
) {
  const list = entries.filter((e) => e.currency === currency);
  const sum = (kind: string) =>
    list
      .filter((e) => e.kind === kind)
      .reduce((s, e) => s + Number(e.amount), 0);
  const gross = sum("SALE"),
    refunds = -sum("REFUND"),
    commission = -sum("COMMISSION"),
    logistics = -sum("LOGISTICS"),
    cost = -sum("COGS") - sum("COGS_REVERSAL");
  return {
    gross,
    refunds,
    net: gross - refunds,
    commission,
    logistics,
    cost,
    contribution: gross - refunds - commission - logistics - cost,
  };
}
export function profitability(order: Order, entries: FinancialEntry[]) {
  const complete = order.lines.every((l) => l.unit_cost_try !== null);
  const values = financialSummary(
    entries.filter((e) => e.order_id === order.id),
    order.currency,
  );
  return {
    ...values,
    complete,
    contribution: complete ? values.contribution : null,
  };
}
