import type { WorkspaceSnapshot } from "@/domain/types";
import { financialSummary, profitability } from "@/domain/finance/calculations";
export function reportData(
  s: WorkspaceSnapshot,
  currency: "RUB" | "TRY",
  from: string,
  to: string,
) {
  const orders = s.orders.filter(
    (o) =>
      o.currency === currency &&
      o.created_at.slice(0, 10) >= from &&
      o.created_at.slice(0, 10) <= to,
  );
  const ids = new Set(orders.map((o) => o.id));
  const entries = s.financial.filter((e) => ids.has(e.order_id));
  return {
    orders,
    entries,
    summary: financialSummary(entries, currency),
    incomplete: orders.filter(
      (o) =>
        ["SHIPPED", "RETURN_PENDING", "RETURNED"].includes(o.status) &&
        !profitability(o, entries).complete,
    ).length,
  };
}
