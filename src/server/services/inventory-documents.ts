import { randomUUID } from "node:crypto";
import { rows, sql, type Tx, type Conn } from "../db";
import type { Actor } from "@/domain/types";
import type { Command } from "@/domain/orders/commands";
import type {
  InventoryDocument,
  InventoryDocumentLine,
} from "@/domain/inventory/documents";
import { DomainError } from "@/domain/permissions";
import { balance } from "@/domain/inventory/stock";
import { movement } from "./inventory";
type DocumentCommand = Extract<
  Command,
  {
    action:
      | "CREATE_INVENTORY_DOCUMENT"
      | "UPDATE_INVENTORY_DOCUMENT"
      | "CONFIRM_INVENTORY_DOCUMENT"
      | "CANCEL_INVENTORY_DOCUMENT";
  }
>;
export async function inventoryDocuments(
  conn: Conn,
  w: string,
): Promise<InventoryDocument[]> {
  const docs = await rows<InventoryDocument>(
    conn,
    sql`SELECT id,kind,status,source_reference,source_order_id,reason,version,created_by,created_at,confirmed_by,confirmed_at,cancelled_by,cancelled_at FROM inventory_documents WHERE workspace_id=${w}::uuid ORDER BY created_at DESC,id`,
  );
  const lines = await rows<InventoryDocumentLine & { document_id: string }>(
    conn,
    sql`SELECT document_id,product_id,quantity,expected_physical,delta FROM inventory_document_lines WHERE workspace_id=${w}::uuid ORDER BY product_id`,
  );
  for (const d of docs) d.lines = lines.filter((l) => l.document_id === d.id);
  return docs;
}
export async function applyInventoryDocument(
  tx: Tx,
  a: Actor,
  c: DocumentCommand,
) {
  const w = a.workspaceId;
  let doc: InventoryDocument;
  if (c.action === "CREATE_INVENTORY_DOCUMENT") {
    const id = randomUUID();
    await tx.execute(
      sql`INSERT INTO inventory_documents(workspace_id,id,kind,source_reference,source_order_id,reason,created_by) VALUES(${w}::uuid,${id},${c.kind},${c.sourceReference},null,${c.reason},${a.userId})`,
    );
    doc = { id, kind: c.kind } as InventoryDocument;
  } else {
    const [found] = await rows<InventoryDocument>(
      tx,
      sql`SELECT * FROM inventory_documents WHERE workspace_id=${w}::uuid AND id=${c.documentId} FOR UPDATE`,
    );
    if (!found) throw new DomainError("Stok belgesi bulunamadı", 404);
    // A different request key cannot approve twice. Stale decisions are conflicts, not false successes.
    if (found.status !== "DRAFT")
      throw new DomainError("Belge artık taslak değil; güncel kaydı açın");
    if (found.version !== c.version)
      throw new DomainError("Belge başka bir işlemle değişti; yenileyin");
    doc = found;
  }
  if (
    c.action === "CREATE_INVENTORY_DOCUMENT" ||
    c.action === "UPDATE_INVENTORY_DOCUMENT"
  ) {
    if (new Set(c.lines.map((l) => l.productId)).size !== c.lines.length)
      throw new DomainError("Aynı SKU tek satırda olmalı");
    if (c.sourceOrderId) {
      const [o] = await rows<{ fulfillment: string }>(
        tx,
        sql`SELECT fulfillment FROM orders WHERE workspace_id=${w}::uuid AND id=${c.sourceOrderId}`,
      );
      if (!o || o.fulfillment !== "FBS")
        throw new DomainError("İlişkili FBS siparişi bulunamadı", 404);
    }
    if (c.action === "CREATE_INVENTORY_DOCUMENT")
      await tx.execute(
        sql`UPDATE inventory_documents SET source_order_id=${c.sourceOrderId} WHERE workspace_id=${w}::uuid AND id=${doc.id}`,
      );
    if (doc.kind === "RECEIPT" && c.lines.some((l) => l.quantity < 1))
      throw new DomainError("Mal kabul adedi sıfır olamaz");
    if (c.action === "UPDATE_INVENTORY_DOCUMENT") {
      await tx.execute(
        sql`DELETE FROM inventory_document_lines WHERE workspace_id=${w}::uuid AND document_id=${doc.id}`,
      );
      await tx.execute(
        sql`UPDATE inventory_documents SET source_reference=${c.sourceReference},source_order_id=${c.sourceOrderId},reason=${c.reason},version=version+1 WHERE workspace_id=${w}::uuid AND id=${doc.id}`,
      );
    }
    for (const l of c.lines) {
      const [p] = await rows(
        tx,
        sql`SELECT id FROM products WHERE workspace_id=${w}::uuid AND id=${l.productId}`,
      );
      if (!p) throw new DomainError("Ürün bulunamadı", 404);
      const b = await balance(tx, w, l.productId);
      await tx.execute(
        sql`INSERT INTO inventory_document_lines(workspace_id,document_id,product_id,quantity,expected_physical) VALUES(${w}::uuid,${doc.id},${l.productId},${l.quantity},${b.physical})`,
      );
    }
  } else if (c.action === "CANCEL_INVENTORY_DOCUMENT") {
    await tx.execute(
      sql`UPDATE inventory_documents SET status='CANCELLED',reason=${c.reason},cancelled_by=${a.userId},cancelled_at=now(),version=version+1 WHERE workspace_id=${w}::uuid AND id=${doc.id}`,
    );
  } else {
    const lines = await rows<InventoryDocumentLine>(
      tx,
      sql`SELECT product_id,quantity,expected_physical,delta FROM inventory_document_lines WHERE workspace_id=${w}::uuid AND document_id=${doc.id}`,
    );
    if (!lines.length) throw new DomainError("Boş belge onaylanamaz");
    for (const l of lines) {
      const b = await balance(tx, w, l.product_id);
      if (doc.kind === "COUNT" && b.physical !== l.expected_physical)
        throw new DomainError(
          "Sayım sonrası stok değişti; taslağı güncelleyip tekrar kontrol edin",
        );
      const delta =
        doc.kind === "RECEIPT" ? l.quantity : l.quantity - b.physical;
      if (b.available + delta < 0)
        throw new DomainError("Sayım rezerve stoğun altına düşemez");
      if (delta)
        await movement(
          tx,
          a,
          l.product_id,
          "MAIN",
          delta,
          doc.kind === "RECEIPT" ? "RECEIPT" : "ADJUSTMENT",
          doc.id,
          `${doc.source_reference} / ${doc.reason}`,
        );
      await tx.execute(
        sql`UPDATE inventory_document_lines SET delta=${delta} WHERE workspace_id=${w}::uuid AND document_id=${doc.id} AND product_id=${l.product_id}`,
      );
    }
    await tx.execute(
      sql`UPDATE inventory_documents SET status='CONFIRMED',confirmed_by=${a.userId},confirmed_at=now(),version=version+1 WHERE workspace_id=${w}::uuid AND id=${doc.id}`,
    );
  }
  return doc.id;
}
