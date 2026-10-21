import type { Order, Product, ReturnRecord, Ledger } from "../types";
export type ReturnLane = "PENDING" | "ACCEPTED" | "REJECTED" | "ALL";
export const returnLabels = {
  PENDING: "Kontrol bekliyor",
  ACCEPTED: "Stoğa alındı",
  REJECTED: "Satışa uygun değil",
} as const;
export type ReturnQueueItem = { record: ReturnRecord; order: Order };
export function returnQueue(
  returns: ReturnRecord[],
  orders: Order[],
  products: Product[],
  lane: ReturnLane,
  query = "",
): ReturnQueueItem[] {
  const catalog = new Map(products.map((p) => [p.id, p])),
    byOrder = new Map(orders.map((o) => [o.id, o]));
  const q = query.trim().toLocaleLowerCase("tr-TR");
  return returns
    .flatMap((record) => {
      const order = byOrder.get(record.order_id);
      if (
        !order ||
        order.fulfillment !== "FBS" ||
        (lane !== "ALL" && record.status !== lane)
      )
        return [];
      const text = [
        order.number,
        order.customer,
        record.reason,
        ...order.lines.flatMap((l) => {
          const p = catalog.get(l.product_id);
          return p ? [p.sku, p.name, p.variant, p.barcode] : [l.product_id];
        }),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      return !q || text.includes(q) ? [{ record, order }] : [];
    })
    .sort(
      (a, b) =>
        a.record.created_at.localeCompare(b.record.created_at) ||
        a.order.id.localeCompare(b.order.id),
    );
}
export function waitingHours(record: ReturnRecord, now: number) {
  return Math.max(
    0,
    Math.floor((now - Date.parse(record.created_at)) / 3600000),
  );
}
export function returnDecisionBlock(
  item: ReturnQueueItem,
  products: Product[],
  ledger: Ledger[],
) {
  if (item.record.status !== "PENDING")
    return "Bu iadenin kontrolü tamamlanmış.";
  if (
    item.order.fulfillment !== "FBS" ||
    item.order.status !== "RETURN_PENDING"
  )
    return "Sipariş ve iade durumları uyuşmuyor. Kayıtları yenileyin.";
  if (!item.order.lines.length) return "İade ürünleri eksik.";
  for (const line of item.order.lines) {
    if (!products.some((p) => p.id === line.product_id))
      return "Ürün kartı bulunamadı; karar verilemez.";
    const received = ledger
      .filter(
        (l) =>
          l.reference === item.order.id &&
          l.product_id === line.product_id &&
          l.warehouse_id === "QUARANTINE",
      )
      .reduce((n, l) => n + l.quantity, 0);
    if (received !== line.quantity)
      return "İadeye ait karantina hareketleri miktarla uyuşmuyor. Kayıtları inceleyin.";
  }
  return null;
}
