import { randomUUID } from "node:crypto";
import { rows, sql, type Tx } from "../db";
import type { Actor, Order } from "@/domain/types";
import { costInOrderCurrency } from "@/domain/finance/calculations";
export async function finance(
  tx: Tx,
  a: Actor,
  o: Order,
  kind: string,
  amount: number,
) {
  await tx.execute(
    sql`INSERT INTO financial_entries VALUES(${a.workspaceId}::uuid,${o.id},${randomUUID()},${kind},${amount},${o.currency},now()) ON CONFLICT(workspace_id,order_id,kind) DO NOTHING`,
  );
}

export async function recordShipmentFinance(tx: Tx, a: Actor, o: Order) {
  const total = o.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  await finance(tx, a, o, "SALE", total);
  await finance(
    tx,
    a,
    o,
    "COMMISSION",
    -Math.round((total * o.commission_bps) / 10000),
  );
  await finance(tx, a, o, "LOGISTICS", -o.logistics);
  if (o.lines.every((l) => l.unit_cost_try !== null))
    await finance(
      tx,
      a,
      o,
      "COGS",
      -o.lines.reduce(
        (s, l) => s + l.quantity * costInOrderCurrency(l.unit_cost_try!, o),
        0,
      ),
    );
}

export async function reverseAcceptedCost(tx: Tx, a: Actor, o: Order) {
  const w = a.workspaceId;
  const [cost] = await rows<{ amount: number }>(
    tx,
    sql`SELECT amount FROM financial_entries WHERE workspace_id=${w}::uuid AND order_id=${o.id} AND kind='COGS'`,
  );
  if (cost) await finance(tx, a, o, "COGS_REVERSAL", -cost.amount);
}
