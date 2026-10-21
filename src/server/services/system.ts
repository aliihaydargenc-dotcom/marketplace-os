import { sql, type Tx } from "../db";
import type { Actor } from "@/domain/types";
import { DomainError } from "@/domain/permissions";
import type { Command } from "@/domain/orders/commands";
import { seed } from "../seed";
export async function applySystem(
  tx: Tx,
  a: Actor,
  c: Extract<Command, { action: "SETTINGS" | "USER" | "RESET" }>,
): Promise<string> {
  const w = a.workspaceId;
  if (c.action === "SETTINGS") {
    await tx.execute(
      sql`UPDATE workspaces SET name=${c.name},settings=settings || ${JSON.stringify({ autoDraft: c.autoDraft })}::jsonb WHERE id=${w}::uuid`,
    );
    return w;
  }
  if (c.action === "USER") {
    if (c.userId === a.userId && (c.role !== "ADMIN" || !c.active))
      throw new DomainError("Kendi yönetici erişiminizi kapatamazsınız");
    // Built-in demo roles remain fixed; additional users can be managed independently.
    if (
      ["admin", "warehouse", "accountant"].includes(c.userId) &&
      c.role !==
        (
          {
            admin: "ADMIN",
            warehouse: "WAREHOUSE",
            accountant: "ACCOUNTANT",
          } as Record<string, string>
        )[c.userId]
    )
      throw new DomainError("Yerleşik demo hesabının rolü değiştirilemez");
    await tx.execute(
      sql`INSERT INTO users VALUES(${w}::uuid,${c.userId},${c.name},${c.role},${c.active}) ON CONFLICT(workspace_id,id) DO UPDATE SET name=EXCLUDED.name,role=EXCLUDED.role,active=EXCLUDED.active`,
    );
    return c.userId;
  }
  if (c.action === "RESET") {
    for (const t of [
      "command_receipts",
      "audit_events",
      "order_cost_corrections",
      "integration_events",
      "financial_entries",
      "returns",
      "invoice_events",
      "invoices",
      "shipments",
      "reservations",
      "stock_ledger",
      "inventory_document_lines",
      "inventory_documents",
      "order_lines",
      "orders",
      "products",
      "warehouses",
      "stores",
    ])
      await tx.execute(
        sql`DELETE FROM ${sql.identifier(t)} WHERE workspace_id=${w}::uuid`,
      );
    await tx.execute(
      sql`UPDATE workspaces SET generation=generation+1 WHERE id=${w}::uuid`,
    );
    await seed(tx, w);
    return w;
  }
  throw new DomainError("Desteklenmeyen sistem işlemi");
}
