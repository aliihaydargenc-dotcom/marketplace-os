import type { Order, FinancialEntry } from "../types";
import {
  costInOrderCurrency,
  financialSummary,
  effectiveUnitCost,
} from "./calculations";
/** Exact minor-unit allocation; deterministic largest remainders preserve totals. */
export function allocate(amount: number, weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  if (!total) return weights.map(() => 0);
  const sign = amount < 0 ? -1 : 1,
    base = BigInt(Math.abs(amount)),
    denominator = BigInt(total);
  const result = weights.map((w, index) => {
    const numerator = base * BigInt(w);
    return {
      index,
      value: Number(numerator / denominator),
      remainder: numerator % denominator,
    };
  });
  const rest = Math.abs(amount) - result.reduce((s, r) => s + r.value, 0);
  const ranked = [...result].sort((a, b) =>
    a.remainder === b.remainder
      ? a.index - b.index
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  for (let i = 0; i < rest; i++) ranked[i].value++;
  return result.map((r) => r.value * sign);
}
export function lineContributions(order: Order, entries: FinancialEntry[]) {
  const own = entries.filter((e) => e.order_id === order.id),
    summary = financialSummary(own, order.currency),
    weights = order.lines.map((l) => l.quantity * l.unit_price);
  const sales = allocate(summary.gross, weights),
    refunds = allocate(summary.refunds, weights),
    commission = allocate(summary.commission, weights),
    logistics = allocate(summary.logistics, weights);
  const complete = order.lines.every(
      (l) => effectiveUnitCost(order, l) !== null,
    ),
    costWeights = order.lines.map(
      (l) =>
        l.quantity *
        costInOrderCurrency(effectiveUnitCost(order, l) ?? 0, order),
    );
  const costs = allocate(summary.cost, costWeights);
  return order.lines.map((l, i) => {
    const cost = costs[i];
    return {
      productId: l.product_id,
      net: sales[i] - refunds[i],
      cost: complete ? cost : null,
      contribution: complete
        ? sales[i] - refunds[i] - commission[i] - logistics[i] - cost
        : null,
    };
  });
}
