import { rows, sql, type Tx } from "../db";
import type { Actor } from "@/domain/types";
import { DomainError } from "@/domain/permissions";
import type { Command } from "@/domain/orders/commands";
import { movement } from "./inventory";
import { finance, reverseAcceptedCost } from "./finance";
import { loadFbsOrder, updateOrderStatus } from "./order-context";
export async function applyReturn(
  tx: Tx,
  a: Actor,
  c: Extract<Command, { action: "RETURN" | "QC" }>,
): Promise<string> {
  const w = a.workspaceId;
  const o = await loadFbsOrder(tx, w, c.orderId);
  const update = (status: string) => updateOrderStatus(tx, w, o.id, status);
  if (c.action === "RETURN") {
    if (["RETURN_PENDING", "RETURNED"].includes(o.status)) return o.id;
    if (o.status !== "SHIPPED")
      throw new DomainError("Yalnızca sevk edilen sipariş iade alınabilir");
    await tx.execute(
      sql`INSERT INTO returns VALUES(${w}::uuid,${o.id},'PENDING',${c.reason},now(),null)`,
    );
    for (const l of o.lines)
      await movement(
        tx,
        a,
        l.product_id,
        "QUARANTINE",
        l.quantity,
        "RETURN_RECEIPT",
        o.id,
        c.reason,
      );
    await finance(
      tx,
      a,
      o,
      "REFUND",
      -o.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0),
    );
    await tx.execute(
      sql`UPDATE invoices SET status='CANCELLED' WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    await update("RETURN_PENDING");
  }
  if (c.action === "QC") {
    const [r] = await rows<{ status: string }>(
      tx,
      sql`SELECT status FROM returns WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    if (!r) throw new DomainError("İade kaydı bulunamadı");
    if (r.status !== "PENDING") return o.id;
    for (const l of o.lines) {
      await movement(
        tx,
        a,
        l.product_id,
        "QUARANTINE",
        -l.quantity,
        c.accept ? "QC_RELEASE" : "QC_REJECT",
        o.id,
        c.reason,
      );
      if (c.accept)
        await movement(
          tx,
          a,
          l.product_id,
          "MAIN",
          l.quantity,
          "QC_RELEASE",
          o.id,
          c.reason,
        );
    }
    if (c.accept) {
      await reverseAcceptedCost(tx, a, o);
    }
    await tx.execute(
      sql`UPDATE returns SET status=${c.accept ? "ACCEPTED" : "REJECTED"},reviewed_at=now(),reason=${c.reason} WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    await update("RETURNED");
  }
  return o.id;
}
