import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  applyViewOperation,
  bulkEligibility,
  defaultOrderView,
  emptyViewPreferences,
  filterOrders,
  orderViewConfigSchema,
} from "../src/domain/orders/views";
import type { Order, Product } from "../src/domain/types";

const product: Product = {
  id: "p",
  sku: "SKU-001",
  name: "İnce havlu",
  variant: "Mavi",
  barcode: "869001",
  category: "Ev",
  cost_try: 100,
  price_rub: 200,
  threshold: 1,
  physical: 5,
  reserved: 0,
  available: 5,
  quarantine: 0,
};
const order: Order = {
  id: "order",
  number: "DEMO-1",
  customer: "Kurgusal alıcı",
  fulfillment: "FBS",
  status: "NEW",
  currency: "RUB",
  created_at: "2026-10-20T21:30:00Z",
  shipped_at: null,
  fx_date: "2026-10-20",
  fx_rate: 485000,
  commission_bps: 1500,
  logistics: 0,
  total: 200,
  lines: [
    {
      order_id: "order",
      product_id: "p",
      quantity: 1,
      packed: 0,
      unit_price: 200,
      unit_cost_try: 100,
    },
  ],
};

describe("personal order views", () => {
  it("enforces date range and mandatory order column", () => {
    const config = defaultOrderView();
    expect(
      orderViewConfigSchema.safeParse({
        ...config,
        filters: { ...config.filters, from: "2026-10-22", to: "2026-10-20" },
      }).success,
    ).toBe(false);
    expect(
      orderViewConfigSchema.safeParse({
        ...config,
        layout: { ...config.layout, visibility: { number: false } },
      }).success,
    ).toBe(false);
  });
  it("prevents Turkish-name duplicates and removes active references on deletion", () => {
    const id = randomUUID();
    const first = applyViewOperation(emptyViewPreferences(), {
      action: "SAVE",
      view: { id, name: "İadeler", config: defaultOrderView() },
    });
    expect(() =>
      applyViewOperation(first, {
        action: "SAVE",
        view: { id: randomUUID(), name: "iadeler", config: defaultOrderView() },
      }),
    ).toThrow("Bu adla");
    const removed = applyViewOperation(first, { action: "DELETE", id });
    expect(removed.views).toHaveLength(0);
    expect(removed.activeId).toBeNull();
    expect(first.views).toHaveLength(1);
  });
  it("combines SKU/barcode search with the Turkey calendar date", () => {
    const filters = {
      ...defaultOrderView().filters,
      from: "2026-10-21",
      to: "2026-10-21",
      query: "869001",
      fulfillment: "FBS" as const,
    };
    expect(filterOrders([order], [product], filters)).toHaveLength(1);
    expect(
      filterOrders([order], [product], { ...filters, query: "İNCE" }),
    ).toHaveLength(1);
    expect(
      filterOrders([order], [product], { ...filters, to: "2026-10-20" }),
    ).toHaveLength(0);
  });
  it("never sends FBO or partially packed records as bulk shipment candidates", () => {
    expect(bulkEligibility(order, "RESERVE")).toBeNull();
    expect(
      bulkEligibility({ ...order, fulfillment: "FBO" }, "RESERVE"),
    ).not.toBeNull();
    expect(
      bulkEligibility({ ...order, status: "READY" }, "SHIP"),
    ).not.toBeNull();
    expect(
      bulkEligibility(
        {
          ...order,
          status: "READY",
          lines: [{ ...order.lines[0], packed: 1 }],
        },
        "SHIP",
      ),
    ).toBeNull();
  });
});
