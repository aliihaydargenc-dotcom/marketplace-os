import { randomUUID } from "node:crypto";
import { DomainError, authorize } from "@/domain/permissions";
import type { Actor, Role } from "@/domain/types";
import { rows, sql, transaction, type Tx } from "../db";

export type PackingLeaseAction =
  "STATUS" | "CLAIM" | "RENEW" | "RELEASE" | "TAKE_OVER";
export type PackingLeaseState = {
  mine: boolean;
  operatorName: string | null;
  expiresAt: string | null;
};

type Lease = {
  terminal_id: string;
  user_id: string;
  name: string;
  expires_at: string;
};

async function activeLease(tx: Tx, workspaceId: string, orderId: string) {
  const [lease] = await rows<Lease>(
    tx,
    sql`SELECT c.terminal_id,c.user_id,u.name,c.expires_at
        FROM packing_claims c
        JOIN users u ON u.workspace_id=c.workspace_id AND u.id=c.user_id
        WHERE c.workspace_id=${workspaceId}::uuid
          AND c.order_id=${orderId} AND c.expires_at>now()`,
  );
  return lease ?? null;
}

function view(lease: Lease | null, terminalId: string): PackingLeaseState {
  return {
    mine: lease?.terminal_id === terminalId,
    operatorName: lease?.name ?? null,
    expiresAt: lease ? new Date(lease.expires_at).toISOString() : null,
  };
}

/** No lease means legacy order-detail commands retain their previous behavior.
 * When a claim exists, all reserve/scan/ship commands must have its terminal ID.
 */
export async function assertPackingLease(
  tx: Tx,
  workspaceId: string,
  orderId: string,
  terminalId?: string,
) {
  const lease = await activeLease(tx, workspaceId, orderId);
  if (lease && lease.terminal_id !== terminalId)
    throw new DomainError(
      "Sipariş başka bir hazırlama terminalinde. Durumu yenileyin.",
      409,
    );
}

export async function packingLease(
  actor: Actor,
  orderId: string,
  terminalId: string,
  action: PackingLeaseAction,
  generation: number,
): Promise<PackingLeaseState> {
  return transaction(actor.workspaceId, async (tx) => {
    const w = actor.workspaceId;
    const [user] = await rows<{ role: Role; active: boolean }>(
      tx,
      sql`SELECT role,active FROM users WHERE workspace_id=${w}::uuid AND id=${actor.userId}`,
    );
    if (!user?.active) throw new DomainError("Kullanıcı aktif değil", 403);
    authorize(user.role, "SCAN");
    const [order] = await rows<{ fulfillment: string; status: string }>(
      tx,
      sql`SELECT fulfillment,status FROM orders WHERE workspace_id=${w}::uuid AND id=${orderId}`,
    );
    if (!order) throw new DomainError("Sipariş bulunamadı", 404);
    if (order.fulfillment !== "FBS")
      throw new DomainError("FBO yalnız referans kaydıdır", 409);
    const [workspace] = await rows<{ generation: number }>(
      tx,
      sql`SELECT generation FROM workspaces WHERE id=${w}::uuid`,
    );
    if (workspace.generation !== generation)
      throw new DomainError("Demo sıfırlandı; sayfayı yenileyin", 409);
    const current = await activeLease(tx, w, orderId);
    if (action === "STATUS") return view(current, terminalId);
    if (action === "RELEASE") {
      if (current?.terminal_id === terminalId)
        await tx.execute(
          sql`DELETE FROM packing_claims WHERE workspace_id=${w}::uuid AND order_id=${orderId} AND terminal_id=${terminalId}::uuid`,
        );
      return view(await activeLease(tx, w, orderId), terminalId);
    }
    if (!["NEW", "RESERVED", "PACKING", "READY"].includes(order.status))
      throw new DomainError("Tamamlanmış sipariş sahiplenilemez", 409);
    if (action === "RENEW") {
      if (!current || current.terminal_id !== terminalId)
        throw new DomainError(
          "Hazırlama sahipliği sona erdi; yeniden üstlenin",
          409,
        );
      await tx.execute(
        sql`UPDATE packing_claims SET expires_at=now()+interval '120 seconds'
            WHERE workspace_id=${w}::uuid AND order_id=${orderId} AND terminal_id=${terminalId}::uuid`,
      );
    } else {
      if (action === "TAKE_OVER" && user.role !== "ADMIN")
        throw new DomainError("Devralma yalnız yöneticiye açıktır", 403);
      if (action === "CLAIM" && current && current.terminal_id !== terminalId)
        throw new DomainError(
          "Sipariş başka bir terminal tarafından hazırlanıyor",
          409,
        );
      await tx.execute(
        sql`INSERT INTO packing_claims(workspace_id,order_id,terminal_id,user_id,expires_at)
            VALUES(${w}::uuid,${orderId},${terminalId}::uuid,${actor.userId},now()+interval '120 seconds')
            ON CONFLICT (workspace_id,order_id) DO UPDATE
            SET terminal_id=EXCLUDED.terminal_id,user_id=EXCLUDED.user_id,
                claimed_at=now(),expires_at=EXCLUDED.expires_at`,
      );
      await tx.execute(
        sql`INSERT INTO audit_events VALUES(${w}::uuid,${randomUUID()},${orderId},
            ${action === "TAKE_OVER" ? "PACKING_TAKE_OVER" : "PACKING_CLAIM"},
            ${actor.userId},'{}'::jsonb,now())`,
      );
    }
    return view(await activeLease(tx, w, orderId), terminalId);
  });
}
