import type { WorkspaceSnapshot } from "../types";
import { financialSummary, profitability } from "./calculations";
export type FinancialDateMode = "COHORT" | "MOVEMENT";
export function reportData(
  s: WorkspaceSnapshot,
  currency: "RUB" | "TRY",
  from: string,
  to: string,
  mode: FinancialDateMode = "COHORT",
) {
  const inRange = (date: string) =>
    date.slice(0, 10) >= from && date.slice(0, 10) <= to;
  const eligible = s.orders.filter((o) => o.currency === currency);
  const cohort = new Set(
    eligible.filter((o) => inRange(o.created_at)).map((o) => o.id),
  );
  const validIds = new Set(eligible.map((o) => o.id));
  const entries = s.financial.filter(
    (e) =>
      e.currency === currency &&
      validIds.has(e.order_id) &&
      (mode === "MOVEMENT" ? inRange(e.created_at) : cohort.has(e.order_id)),
  );
  const ids =
    mode === "MOVEMENT" ? new Set(entries.map((e) => e.order_id)) : cohort;
  const orders = eligible.filter((o) => ids.has(o.id));
  return {
    orders,
    entries,
    summary: financialSummary(entries, currency),
    incomplete: orders.filter(
      (o) =>
        ["SHIPPED", "RETURN_PENDING", "RETURNED"].includes(o.status) &&
        !profitability(o, entries).complete,
    ).length,
    mode,
  };
}
