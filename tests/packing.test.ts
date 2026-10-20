import { describe, expect, it } from "vitest";
import { packingQueue, packingShortages } from "../src/domain/orders/packing";
import type { Order, Product } from "../src/domain/types";

const product: Product = {
  id: "p1",
  sku: "SKU-1",
  name: "İnce havlu",
  variant: "Mavi",
  barcode: "869001",
  category: "Ev",
  cost_try: 100,
  price_rub: 200,
  threshold: 1,
  physical: 5,
  reserved: 3,
  available: 2,
  quarantine: 0,
};
function order(id: string, status: Order["status"] = "NEW"): Order {
  return {
    id,
    number: `DEMO-${id}`,
    customer: "Kurgusal alıcı",
    fulfillment: "FBS",
    status,
    currency: "RUB",
    created_at: "2026-10-20T10:00:00Z",
    shipped_at: null,
    fx_date: "2026-10-20",
    fx_rate: 1000000,
    commission_bps: 1500,
    logistics: 100,
    lines: [
      {
        order_id: id,
        product_id: "p1",
        quantity: 3,
        packed: 0,
        unit_price: 200,
        unit_cost_try: 100,
      },
    ],
    total: 600,
  };
}

describe("packing queue eligibility", () => {
  it("excludes FBO and terminal orders and preserves oldest-first order without mutating input", () => {
    const later = {
      ...order("later", "PACKING"),
      created_at: "2026-10-21T10:00:00Z",
    };
    const source = [
      later,
      order("old"),
      { ...order("fbo"), fulfillment: "FBO" as const },
      order("shipped", "SHIPPED"),
      order("cancelled", "CANCELLED"),
      order("return", "RETURN_PENDING"),
    ];
    expect(packingQueue(source, [product], "ALL", "").map((o) => o.id)).toEqual(
      ["old", "later"],
    );
    expect(source[0]).toBe(later);
  });
  it("flags missing new stock but never mistakes an existing reservation for a shortage", () => {
    expect(packingShortages(order("new"), [product])).toEqual([
      { productId: "p1", missing: 1 },
    ]);
    expect(packingShortages(order("reserved", "RESERVED"), [product])).toEqual(
      [],
    );
    expect(
      packingQueue(
        [order("new"), order("reserved", "RESERVED")],
        [product],
        "BLOCKED",
        "",
      ).map((o) => o.id),
    ).toEqual(["new"]);
    expect(packingQueue([order("new")], [product], "NEW", "")).toEqual([]);
  });
  it("separates active and ready lanes and searches SKU/barcode/Turkish product names", () => {
    const source = [
      order("reserved", "RESERVED"),
      order("packing", "PACKING"),
      order("ready", "READY"),
    ];
    expect(packingQueue(source, [product], "ACTIVE", "869001")).toHaveLength(2);
    expect(
      packingQueue(source, [product], "READY", "İNCE").map((o) => o.id),
    ).toEqual(["ready"]);
    expect(packingQueue(source, [product], "ALL", "SKU-1")).toHaveLength(3);
    expect(packingQueue(source, [product], "ALL", "unknown")).toHaveLength(0);
  });
});
