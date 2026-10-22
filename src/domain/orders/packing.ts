import type { Order, Product } from "../types";

export type PackingLane = "ALL" | "NEW" | "ACTIVE" | "READY" | "BLOCKED";

export function isPackingOrder(order: Order) {
  return (
    order.fulfillment === "FBS" &&
    ["NEW", "RESERVED", "PACKING", "READY"].includes(order.status)
  );
}

// Read-side estimate only; server commands recheck stock under lock.
function shortagesWithCatalog(order: Order, catalog: Map<string, Product>) {
  if (order.status !== "NEW") return [];
  return order.lines.flatMap((line) => {
    const p = catalog.get(line.product_id);
    const missing = Math.max(0, line.quantity - (p?.available ?? 0));
    return missing ? [{ productId: line.product_id, missing }] : [];
  });
}
export function packingShortages(order: Order, products: Product[]) {
  return shortagesWithCatalog(order, new Map(products.map((p) => [p.id, p])));
}
export function groupPackingQueue(
  orders: Order[],
  products: Product[],
): Record<PackingLane, Order[]> {
  const catalog = new Map(products.map((p) => [p.id, p]));
  const all = orders
    .filter(isPackingOrder)
    .sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
    );
  const groups: Record<PackingLane, Order[]> = {
    ALL: all,
    NEW: [],
    ACTIVE: [],
    READY: [],
    BLOCKED: [],
  };
  for (const o of all) {
    if (o.status === "NEW")
      groups[shortagesWithCatalog(o, catalog).length ? "BLOCKED" : "NEW"].push(
        o,
      );
    else if (o.status === "RESERVED" || o.status === "PACKING")
      groups.ACTIVE.push(o);
    else if (o.status === "READY") groups.READY.push(o);
  }
  return groups;
}
export function filterPackingQueue(
  orders: Order[],
  products: Product[],
  search: string,
): Order[] {
  const query = search.trim().toLocaleLowerCase("tr-TR");
  if (!query) return orders;
  const catalog = new Map(products.map((p) => [p.id, p]));
  return orders.filter((o) =>
    [
      o.number,
      o.customer,
      ...o.lines.flatMap((l) => {
        const p = catalog.get(l.product_id);
        return p ? [p.sku, p.name, p.barcode, p.variant] : [];
      }),
    ]
      .join(" ")
      .toLocaleLowerCase("tr-TR")
      .includes(query),
  );
}
export function packingPage(
  queue: Order[],
  visibleCount: number,
  selectedId: string | null,
): Order[] {
  const page = queue.slice(0, Math.max(0, visibleCount));
  if (selectedId && !page.some((o) => o.id === selectedId)) {
    const found = queue.find((o) => o.id === selectedId);
    if (found) page.push(found);
  }
  return page;
}
export function packingQueue(
  orders: Order[],
  products: Product[],
  lane: PackingLane,
  search: string,
) {
  return filterPackingQueue(
    groupPackingQueue(orders, products)[lane],
    products,
    search,
  );
}
