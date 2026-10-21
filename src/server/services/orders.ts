import { recordIntegration, type IntegrationProviders } from "./integrations";
import { randomUUID } from "node:crypto";
import { rows, sql, type Tx } from "../db";
import type { Actor } from "@/domain/types";
import { DomainError } from "@/domain/permissions";
import type { Command } from "@/domain/orders/commands";
import { requireAvailable, balance } from "@/domain/inventory/stock";
import { movement } from "./inventory";
import { recordShipmentFinance } from "./finance";
import { draft } from "./invoices";
import { loadFbsOrder, updateOrderStatus } from "./order-context";
export async function applyOrder(
  tx: Tx,
  a: Actor,
  c: Extract<
    Command,
    { action: "CREATE_ORDER" | "RESERVE" | "SCAN" | "SHIP" | "CANCEL" }
  >,
  providers: IntegrationProviders,
): Promise<string> {
  const w = a.workspaceId;
  if (c.action === "CREATE_ORDER") {
    if (new Set(c.lines.map((l) => l.productId)).size !== c.lines.length)
      throw new DomainError("Aynı SKU tek satırda birleştirilmeli");
    const id = randomUUID(),
      number = `DEMO-${id.slice(0, 8).toUpperCase()}`;
    await tx.execute(
      sql`INSERT INTO orders VALUES(${w}::uuid,${id},'ozon-demo',${number},${c.customer},'FBS','NEW',${c.currency},now(),null,${c.fxDate}::date,${c.fxRate},${c.commissionBps},${c.logistics})`,
    );
    for (const l of c.lines) {
      const [p] = await rows<{
        price_rub: number;
        cost_try: number | null;
        active: boolean;
      }>(
        tx,
        sql`SELECT price_rub,cost_try,active FROM products WHERE workspace_id=${w}::uuid AND id=${l.productId}`,
      );
      if (!p) throw new DomainError("Ürün bulunamadı", 404);
      if (!p.active)
        throw new DomainError("Pasif ürün yeni siparişe eklenemez");
      const price =
        c.currency === "RUB"
          ? p.price_rub
          : Math.round((p.price_rub * c.fxRate) / 1000000);
      await tx.execute(
        sql`INSERT INTO order_lines VALUES(${w}::uuid,${id},${l.productId},${l.quantity},0,${price},${p.cost_try})`,
      );
    }
    return id;
  }
  const o = await loadFbsOrder(tx, w, c.orderId);
  const update = (status: string) => updateOrderStatus(tx, w, o.id, status);
  if (c.action === "RESERVE") {
    if (["RESERVED", "PACKING", "READY"].includes(o.status)) return o.id;
    if (o.status !== "NEW")
      throw new DomainError("Bu durumdan rezervasyon yapılamaz");
    for (const l of o.lines) {
      await requireAvailable(tx, w, l.product_id, l.quantity);
      await tx.execute(
        sql`INSERT INTO reservations VALUES(${w}::uuid,${o.id},${l.product_id},'MAIN',${l.quantity},true)`,
      );
    }
    await update("RESERVED");
  }
  if (c.action === "SCAN") {
    if (!["RESERVED", "PACKING"].includes(o.status))
      throw new DomainError("Önce stok rezervasyonu yapın");
    const [p] = await rows<{ id: string }>(
        tx,
        sql`SELECT id FROM products WHERE workspace_id=${w}::uuid AND barcode=${c.barcode}`,
      ),
      l = o.lines.find((l) => l.product_id === p?.id);
    if (!l) throw new DomainError("Barkod bu siparişe ait değil");
    if (l.packed >= l.quantity)
      throw new DomainError("Bu ürünün bütün adetleri doğrulandı");
    const b = await balance(tx, w, l.product_id);
    if (b.physical < b.reserved)
      throw new DomainError("Fiziksel stok rezervasyonları karşılamıyor");
    await tx.execute(
      sql`UPDATE order_lines SET packed=packed+1 WHERE workspace_id=${w}::uuid AND order_id=${o.id} AND product_id=${l.product_id}`,
    );
    l.packed++;
    await update(
      o.lines.every((l) => l.packed === l.quantity) ? "READY" : "PACKING",
    );
  }
  if (c.action === "SHIP") {
    if (["SHIPPED", "RETURN_PENDING", "RETURNED"].includes(o.status))
      return o.id;
    if (o.status !== "READY" || o.lines.some((l) => l.packed !== l.quantity))
      throw new DomainError(
        "Tüm ürünleri barkodla doğrulamadan sevk edemezsiniz",
      );
    for (const l of o.lines) {
      const b = await balance(tx, w, l.product_id);
      const [r] = await rows<{ quantity: number }>(
        tx,
        sql`SELECT quantity FROM reservations WHERE workspace_id=${w}::uuid AND order_id=${o.id} AND product_id=${l.product_id} AND active`,
      );
      if (!r || r.quantity !== l.quantity || b.physical < b.reserved)
        throw new DomainError("Rezervasyon veya fiziksel stok tutarsız");
      await movement(
        tx,
        a,
        l.product_id,
        "MAIN",
        -l.quantity,
        "SHIPMENT",
        o.id,
        "FBS sevkiyat • demo",
      );
    }
    await tx.execute(
      sql`UPDATE reservations SET active=false WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    await tx.execute(
      sql`INSERT INTO shipments VALUES(${w}::uuid,${o.id},${"DEMO-TRK-" + o.id.slice(0, 8)},now())`,
    );
    await tx.execute(
      sql`UPDATE orders SET status='SHIPPED',shipped_at=now() WHERE workspace_id=${w}::uuid AND id=${o.id}`,
    );
    await recordIntegration(
      tx,
      w,
      o.id,
      "OZON",
      "DEMO_SHIPPED",
      o.id,
      await providers.ozon.syncStatus({
        externalOrderId: o.id,
        externalStatus: "DEMO_SHIPPED",
        idempotencyKey: o.id,
      }),
    );
    await recordShipmentFinance(tx, a, o);
    const [settings] = await rows<{ settings: { autoDraft: boolean } }>(
      tx,
      sql`SELECT settings FROM workspaces WHERE id=${w}::uuid`,
    );
    if (settings.settings.autoDraft)
      await draft(tx, w, o.id, providers, a.userId);
  }
  if (c.action === "CANCEL") {
    if (o.status === "CANCELLED") return o.id;
    if (!["NEW", "RESERVED", "PACKING", "READY"].includes(o.status))
      throw new DomainError(
        "Sevk edilen sipariş iptal edilemez; iade kullanın",
      );
    await tx.execute(
      sql`UPDATE reservations SET active=false WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    await update("CANCELLED");
  }
  return o.id;
}
