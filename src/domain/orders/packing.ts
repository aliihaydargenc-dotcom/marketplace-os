import type { Order, Product } from "../types";

export type PackingLane = "ALL" | "NEW" | "ACTIVE" | "READY" | "BLOCKED";

export function isPackingOrder(order: Order) {
  return (
    order.fulfillment === "FBS" &&
    ["NEW", "RESERVED", "PACKING", "READY"].includes(order.status)
  );
}

// Read-side estimate only. RESERVE/SCAN/SHIP recheck stock inside the server lock.
export function packingShortages(order: Order, products: Product[]) {
  if (order.status !== "NEW") return [];
  const catalog = new Map(products.map((p) => [p.id, p]));
  return order.lines.flatMap((line) => {
    const product = catalog.get(line.product_id);
    const missing = Math.max(0, line.quantity - (product?.available ?? 0));
    return missing ? [{ productId: line.product_id, missing }] : [];
  });
}

export function packingQueue(
  orders: Order[],
  products: Product[],
  lane: PackingLane,
  search: string,
) {
  const query = search.trim().toLocaleLowerCase("tr-TR");
  const catalog = new Map(products.map((p) => [p.id, p]));
  return orders
    .filter(isPackingOrder)
    .filter((order) => {
      const blocked = packingShortages(order, products).length > 0;
      const inLane =
        lane === "ALL" ||
        (lane === "BLOCKED" && blocked) ||
        (lane === "NEW" && order.status === "NEW" && !blocked) ||
        (lane === "ACTIVE" && ["RESERVED", "PACKING"].includes(order.status)) ||
        (lane === "READY" && order.status === "READY");
      const haystack = [
        order.number,
        order.customer,
        ...order.lines.flatMap((line) => {
          const p = catalog.get(line.product_id);
          return p ? [p.sku, p.name, p.barcode, p.variant] : [];
        }),
      ].join(" ");
      return inLane && haystack.toLocaleLowerCase("tr-TR").includes(query);
    })
    .sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
    );
}
