import { randomUUID } from "node:crypto";
import { rows, sql, type Tx } from "../db";
import type { Actor } from "@/domain/types";
import { DomainError } from "@/domain/permissions";
import type { Command } from "@/domain/orders/commands";
import type { Order } from "@/domain/types";
export async function draft(tx: Tx, w: string, orderId: string) {
  await tx.execute(
    sql`INSERT INTO invoices(workspace_id,order_id,id,status,created_at) VALUES(${w}::uuid,${orderId},${randomUUID()},'DRAFT',now()) ON CONFLICT(workspace_id,order_id) DO NOTHING`,
  );
}

export async function applyInvoice(
  tx: Tx,
  a: Actor,
  c: Extract<Command, { action: "INVOICE" | "INVOICE_STATUS" }>,
  o: Order,
): Promise<string> {
  const w = a.workspaceId;
  if (c.action === "INVOICE") {
    if (o.status !== "SHIPPED")
      throw new DomainError("Fatura taslağı için sevkiyat tamamlanmalı");
    await draft(tx, w, o.id);
  }
  if (c.action === "INVOICE_STATUS") {
    if (c.status === "DRAFT" && o.status !== "SHIPPED")
      throw new DomainError(
        "İade veya iptal edilen siparişin faturası aktifleştirilemez",
      );
    const updated = await rows(
      tx,
      sql`UPDATE invoices SET status=${c.status},error=${c.status === "ERROR" ? c.reason : null} WHERE workspace_id=${w}::uuid AND order_id=${o.id} RETURNING id`,
    );
    if (!updated.length) throw new DomainError("Fatura bulunamadı", 404);
  }
  return o.id;
}
