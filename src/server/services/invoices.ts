import {
  demoProviders,
  recordIntegration,
  type IntegrationProviders,
} from "./integrations";
import type { Invoice } from "@/domain/types";
import { randomUUID } from "node:crypto";
import { rows, sql, type Tx } from "../db";
import type { Actor } from "@/domain/types";
import { DomainError } from "@/domain/permissions";
import type { Command } from "@/domain/orders/commands";
import type { Order } from "@/domain/types";
export async function draft(
  tx: Tx,
  w: string,
  orderId: string,
  providers: IntegrationProviders = demoProviders(),
  actor = "system",
) {
  const created = await rows<Invoice>(
    tx,
    sql`INSERT INTO invoices(workspace_id,order_id,id,status,created_at) VALUES(${w}::uuid,${orderId},${randomUUID()},'DRAFT',now()) ON CONFLICT(workspace_id,order_id) DO NOTHING RETURNING id,order_id,status,label,created_at,error`,
  );
  if (created[0]) {
    await tx.execute(
      sql`INSERT INTO invoice_events(workspace_id,id,invoice_id,order_id,from_status,to_status,reason,actor) VALUES(${w}::uuid,${randomUUID()},${created[0].id},${orderId},null,'DRAFT','Demo taslak oluşturuldu',${actor})`,
    );
    const receipt = await providers.parasut.salesInvoice(created[0]);
    if (receipt.status !== "DRAFT")
      throw new DomainError("Demo fatura yalnız taslak olabilir");
    await recordIntegration(
      tx,
      w,
      orderId,
      "PARASUT",
      "SALES_INVOICE",
      created[0].id,
      receipt,
    );
  }
}

export async function applyInvoice(
  tx: Tx,
  a: Actor,
  c: Extract<Command, { action: "INVOICE" | "INVOICE_STATUS" }>,
  o: Order,
  providers: IntegrationProviders,
): Promise<string> {
  const w = a.workspaceId;
  if (c.action === "INVOICE") {
    if (o.status !== "SHIPPED")
      throw new DomainError("Fatura taslağı için sevkiyat tamamlanmalı");
    const [existing] = await rows<{ status: string }>(
      tx,
      sql`SELECT status FROM invoices WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    if (existing && existing.status !== "DRAFT")
      throw new DomainError("Mevcut belgeyi detaydan gerekçeyle yeniden açın");
    await draft(tx, w, o.id, providers, a.userId);
  }
  if (c.action === "INVOICE_STATUS") {
    if (c.status === "DRAFT" && o.status !== "SHIPPED")
      throw new DomainError(
        "İade veya iptal edilen siparişin faturası aktifleştirilemez",
      );
    await changeInvoiceStatus(tx, a, o.id, c.status, c.reason);
  }
  return o.id;
}

export async function changeInvoiceStatus(
  tx: Tx,
  a: Actor,
  orderId: string,
  status: Invoice["status"],
  reason: string,
  optional = false,
) {
  const [current] = await rows<Invoice>(
    tx,
    sql`SELECT id,status FROM invoices WHERE workspace_id=${a.workspaceId}::uuid AND order_id=${orderId}`,
  );
  if (!current) {
    if (optional) return;
    throw new DomainError("Fatura bulunamadı", 404);
  }
  if (current.status === status) {
    if (optional) return;
    throw new DomainError("Belge zaten bu durumda");
  }
  await tx.execute(
    sql`UPDATE invoices SET status=${status},error=${status === "ERROR" ? reason : null} WHERE workspace_id=${a.workspaceId}::uuid AND id=${current.id}`,
  );
  await tx.execute(
    sql`INSERT INTO invoice_events(workspace_id,id,invoice_id,order_id,from_status,to_status,reason,actor) VALUES(${a.workspaceId}::uuid,${randomUUID()},${current.id},${orderId},${current.status},${status},${reason},${a.userId})`,
  );
}
