import { createHash, randomUUID } from "node:crypto";
import { rows, sql, transaction, type Tx } from "./db";
import type { Actor } from "@/domain/types";
import { authorize, DomainError } from "@/domain/permissions";
import { commandSchema, type Command } from "@/domain/orders/commands";
import { applyCatalog } from "./catalog";
import { applyOrder } from "./services/orders";
import { applyInventory } from "./services/inventory";
import { applyReturn } from "./services/returns";
import { applyInvoice } from "./services/invoices";
import { applySystem } from "./services/system";
import { loadFbsOrder } from "./services/order-context";
export async function execute(
  actor: Actor,
  input: Command,
  key: string,
  generation: number,
) {
  const command = commandSchema.parse(input);
  authorize(actor.role, command.action);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex");
  return transaction(actor.workspaceId, async (tx) => {
    const w = actor.workspaceId;
    // Re-read user permissions inside the same lock as the mutation; stale sessions cannot retain rights.
    const [user] = await rows<{ role: Actor["role"]; active: boolean }>(
      tx,
      sql`SELECT role,active FROM users WHERE workspace_id=${w}::uuid AND id=${actor.userId}`,
    );
    if (!user?.active) throw new DomainError("Kullanıcı aktif değil", 403);
    authorize(user.role, command.action);
    const [workspace] = await rows<{ generation: number }>(
      tx,
      sql`SELECT generation FROM workspaces WHERE id=${w}::uuid`,
    );
    if (workspace.generation !== generation)
      throw new DomainError("Demo sıfırlandı; sayfayı yenileyin");
    const [receipt] = await rows<{
      fingerprint: string;
      result: { reference: string };
    }>(
      tx,
      sql`SELECT fingerprint,result FROM command_receipts WHERE workspace_id=${w}::uuid AND key=${key}`,
    );
    if (receipt) {
      if (receipt.fingerprint !== fingerprint)
        throw new DomainError("İşlem anahtarı farklı istekle kullanılmış");
      return receipt.result;
    }
    const reference = await apply(tx, { ...actor, role: user.role }, command);
    const result = { reference };
    await tx.execute(
      sql`INSERT INTO command_receipts VALUES(${w}::uuid,${key},${fingerprint},${JSON.stringify(result)}::jsonb)`,
    );
    await tx.execute(
      sql`INSERT INTO audit_events VALUES(${w}::uuid,${randomUUID()},${reference},${command.action},${actor.userId},${JSON.stringify(command)}::jsonb,now())`,
    );
    return result;
  });
}
async function apply(tx: Tx, a: Actor, c: Command): Promise<string> {
  switch (c.action) {
    case "CREATE_PRODUCT":
    case "UPDATE_CATALOG":
    case "IMPORT_OZON_DEMO":
      return applyCatalog(tx, a, c);
    case "CREATE_ORDER":
    case "RESERVE":
    case "SCAN":
    case "SHIP":
    case "CANCEL":
      return applyOrder(tx, a, c);
    case "ADJUST":
    case "PRODUCT":
      return applyInventory(tx, a, c);
    case "RETURN":
    case "QC":
      return applyReturn(tx, a, c);
    case "INVOICE":
    case "INVOICE_STATUS":
      return applyInvoice(
        tx,
        a,
        c,
        await loadFbsOrder(tx, a.workspaceId, c.orderId),
      );
    case "SETTINGS":
    case "USER":
    case "RESET":
      return applySystem(tx, a, c);
    default: {
      const unhandled: never = c;
      throw new Error(`Unhandled command: ${unhandled}`);
    }
  }
}
