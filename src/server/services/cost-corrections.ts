import type { Actor } from "@/domain/types";
import type { Command } from "@/domain/orders/commands";
import { DomainError } from "@/domain/permissions";
import {
  effectiveUnitCost,
  costInOrderCurrency,
} from "@/domain/finance/calculations";
import { rows, sql, type Tx } from "../db";
import { loadFbsOrder } from "./order-context";
import { finance, reverseAcceptedCost } from "./finance";
export async function applyCostCorrection(
  tx: Tx,
  a: Actor,
  c: Extract<Command, { action: "CORRECT_MISSING_COST" }>,
) {
  const w = a.workspaceId,
    o = await loadFbsOrder(tx, w, c.orderId);
  if (!["SHIPPED", "RETURN_PENDING", "RETURNED"].includes(o.status))
    throw new DomainError("Maliyet tamamlama sevkiyat sonrası yapılır");
  const line = o.lines.find((l) => l.product_id === c.productId);
  if (!line) throw new DomainError("Sipariş satırı bulunamadı", 404);
  if (line.unit_cost_try !== null)
    throw new DomainError("Bilinen tarihsel maliyet değiştirilemez");
  const existing = await rows<{ product_id: string; cost_try: number }>(
    tx,
    sql`SELECT product_id,cost_try FROM order_cost_corrections WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
  );
  if (existing.some((x) => x.product_id === c.productId))
    throw new DomainError("Bu satırın maliyeti zaten tamamlanmış");
  await tx.execute(
    sql`INSERT INTO order_cost_corrections(workspace_id,order_id,product_id,cost_try,reason,created_by) VALUES(${w}::uuid,${o.id},${c.productId},${c.costTry},${c.reason},${a.userId})`,
  );
  o.cost_corrections = Object.fromEntries(
    [...existing, { product_id: c.productId, cost_try: c.costTry }].map((x) => [
      x.product_id,
      x.cost_try,
    ]),
  );
  if (o.lines.every((l) => effectiveUnitCost(o, l) !== null)) {
    await finance(
      tx,
      a,
      o,
      "COGS",
      -o.lines.reduce(
        (sum, l) =>
          sum + l.quantity * costInOrderCurrency(effectiveUnitCost(o, l)!, o),
        0,
      ),
    );
    const [r] = await rows<{ status: string }>(
      tx,
      sql`SELECT status FROM returns WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    if (r?.status === "ACCEPTED") await reverseAcceptedCost(tx, a, o);
  }
  return o.id;
}
