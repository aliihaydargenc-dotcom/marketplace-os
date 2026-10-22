import { describe, expect, it } from "vitest";
import {
  filterPackingQueue,
  groupPackingQueue,
  packingPage,
  packingQueue,
} from "../src/domain/orders/packing";
import type { Order, Product } from "../src/domain/types";

const products: Product[] = Array.from({ length: 80 }, (_, i) => ({
  id: "p" + i,
  sku: "SKU-" + i,
  name: i === 21 ? "İnce havlu" : "Ürün " + i,
  variant: "Mavi",
  barcode: "BC-" + i,
  category: "QA",
  cost_try: 10,
  price_rub: 100,
  physical: 1000,
  reserved: 0,
  available: i < 3 ? 0 : 1000,
  quarantine: 0,
  threshold: 1,
}));
function order(
  i: number,
  status: Order["status"],
  fulfillment: Order["fulfillment"] = "FBS",
): Order {
  const p = i < 3 ? "p" + i : "p" + (i % 80);
  return {
    id: "o" + i,
    number: "DEMO-" + i,
    customer: "Müşteri " + i,
    fulfillment,
    status,
    currency: "RUB",
    created_at: new Date(Date.UTC(2026, 9, 1, 0, i % 60)).toISOString(),
    shipped_at: null,
    fx_date: "2026-10-01",
    fx_rate: 1,
    commission_bps: 0,
    logistics: 0,
    lines: [
      {
        order_id: "o" + i,
        product_id: p,
        quantity: 2,
        packed: status === "READY" ? 2 : 0,
        unit_price: 100,
        unit_cost_try: 10,
      },
    ],
    total: 200,
  };
}
describe("UX03 large preparation queue", () => {
  const source = Array.from({ length: 1205 }, (_, i) => {
    if (i === 1204) return order(i, "NEW", "FBO");
    if (i === 1203) return order(i, "SHIPPED");
    return order(
      i,
      i < 3
        ? "NEW"
        : i % 5 === 0
          ? "READY"
          : i % 5 === 1
            ? "RESERVED"
            : i % 5 === 2
              ? "PACKING"
              : "NEW",
    );
  });
  it("keeps all 1203 active FBS orders, exactly 3 blocked and no source mutation", () => {
    const g = groupPackingQueue(source, products);
    expect(g.ALL).toHaveLength(1203);
    expect(g.BLOCKED).toHaveLength(3);
    expect(
      g.NEW.length + g.BLOCKED.length + g.ACTIVE.length + g.READY.length,
    ).toBe(1203);
    expect(g.ALL[0].created_at <= g.ALL[g.ALL.length - 1].created_at).toBe(
      true,
    );
    expect(source[0].id).toBe("o0");
  });
  it("searches beyond the first 80 and keeps selected item visible", () => {
    const g = groupPackingQueue(source, products);
    const matches = filterPackingQueue(g.ALL, products, "Müşteri 1187");
    expect(matches.map((o) => o.id)).toEqual(["o1187"]);
    const far = packingPage(g.ALL, 80, "o1187");
    expect(far).toHaveLength(81);
    expect(far.some((o) => o.id === "o1187")).toBe(true);
    expect(packingPage(g.ALL, 160, null)).toHaveLength(160);
    expect(packingPage(g.ALL, 1205, null)).toHaveLength(1203);
  });
  it("filters Turkish product names and barcode across all groups", () => {
    const all = packingQueue(source, products, "ALL", "BC-21");
    expect(all.length).toBeGreaterThan(0);
    expect(
      packingQueue(source, products, "ALL", "İNCE HAVLU").length,
    ).toBeGreaterThan(0);
  });
  it("does not admit closed or FBO order IDs into any visible queue", () => {
    const g = groupPackingQueue(source, products);
    for (const lane of ["ALL", "NEW", "ACTIVE", "READY", "BLOCKED"] as const) {
      expect(g[lane].some((o) => o.id === "o1203" || o.id === "o1204")).toBe(
        false,
      );
    }
  });
});
