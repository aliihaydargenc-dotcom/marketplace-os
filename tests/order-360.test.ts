import { describe, expect, it } from "vitest";
import { order360View } from "../src/domain/orders/order-360";
import type { Order, Product, WorkspaceSnapshot, Role } from "../src/domain/types";

const product: Product = {
  id: "p1", sku: "SKU-001", name: "Ürün", variant: "Mavi", barcode: "123",
  category: "Test", cost_try: 300, price_rub: 1000, physical: 9,
  reserved: 0, available: 9, quarantine: 0, threshold: 1,
};
const order = (overrides: Partial<Order> = {}): Order => ({
  id: "o1", number: "DEMO-001", customer: "Demo", fulfillment: "FBS",
  status: "NEW", currency: "RUB", created_at: "2026-10-21T12:00:00Z",
  shipped_at: null, fx_date: "2026-10-21", fx_rate: 500000,
  commission_bps: 1000, logistics: 100, total: 2000,
  lines: [{ order_id: "o1", product_id: "p1", quantity: 2, packed: 0, unit_price: 1000, unit_cost_try: 300 }],
  ...overrides,
});
const snapshot = (role: Role, overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot => ({
  actor: { role, userId: "u", workspaceId: "w" },
  workspace: { id: "w", name: "Demo", generation: 1, settings: {} },
  products: [product], orders: [order()], ledger: [], financial: [], invoices: [],
  returns: [], audit: [], users: [],
  ...overrides,
});

describe("order 360 read model", () => {
  it("separates a reservable order from a stock shortage without changing stock", () => {
    const normal = snapshot("WAREHOUSE");
    const actual = order360View(order(), normal);
    expect(actual.signals).toEqual([expect.objectContaining({ id: "reserve", level: "NEXT" })]);
    expect(actual.steps.find((s) => s.id === "reserve")?.state).toBe("CURRENT");
    const short = snapshot("WAREHOUSE", { products: [{ ...product, available: 1 }] });
    expect(order360View(order(), short).signals).toEqual([expect.objectContaining({ id: "shortage", level: "ATTENTION" })]);
    expect(short.products[0].available).toBe(1);
  });
  it("records partial barcodes and manual shipping before shipment", () => {
    const inProgress = order({ status: "PACKING", lines: [{...order().lines[0], packed: 1}] });
    const packing = order360View(inProgress, snapshot("WAREHOUSE"));
    expect(packing.signals[0]?.id).toBe("packing");
    expect(packing.steps.find((s) => s.id === "pack")?.state).toBe("CURRENT");
    const ready = order({ status: "READY", lines: [{...order().lines[0], packed: 2}] });
    expect(order360View(ready, snapshot("WAREHOUSE")).signals[0]?.id).toBe("shipping");
    expect(order360View(ready, snapshot("WAREHOUSE")).steps.find((s) => s.id === "ship")?.state).toBe("CURRENT");
  });
  it("only calls existing invoice a DEMO / TASLAK and never claims financial reconciliation", () => {
    const shipped = order({
      status: "SHIPPED", shipped_at: "2026-10-21T13:00:00Z",
      invoice_id: "i1", invoice_status: "ERROR",
      lines: [{ ...order().lines[0], packed: 2, unit_cost_try: null }],
    });
    const data = snapshot("ACCOUNTANT", {
      orders: [shipped],
      invoices: [{id:"i1",order_id:"o1",status:"ERROR",label:"DEMO / TASLAK",created_at:"2026-10-21T13:02:00Z",error:"Demo belge hatası"}],
      financial: [{id:"f1",order_id:"o1",kind:"SALE",amount:2000,currency:"RUB",created_at:"2026-10-21T13:00:00Z"}],
    });
    const view = order360View(shipped, data);
    expect(view.signals.map((s) => s.id)).toEqual(["invoice-error", "cost"]);
    expect(view.steps.find((s) => s.id === "finance")?.detail).toContain("mutabakat onayı değildir");
    expect(view.steps.find((s) => s.id === "invoice")?.state).toBe("CURRENT");
    expect(view.events.some((event) => event.title === "DEMO / TASLAK oluşturuldu")).toBe(true);
  });
  it("hides financial and document history from warehouse views", () => {
    const shipped = order({
      status: "SHIPPED", shipped_at: "2026-10-21T13:00:00Z",
      invoice_id: "i1", lines: [{...order().lines[0], packed:2}],
    });
    const data = snapshot("WAREHOUSE", {
      financial: [{id:"f1",order_id:"o1",kind:"SALE",amount:2000,currency:"RUB",created_at:"2026-10-21T13:00:00Z"}],
      invoiceEvents: [{id:"ie1",invoice_id:"i1",order_id:"o1",from_status:null,to_status:"DRAFT",reason:"Demo",actor:"u",created_at:"2026-10-21T13:00:00Z"}],
      ledger: [{id:"l1",product_id:"p1",warehouse_id:"w1",quantity:-2,kind:"SHIPPING",reference:"o1",reason:"Sevk",actor:"u",created_at:"2026-10-21T13:00:00Z"}],
    });
    const view = order360View(shipped, data);
    expect(view.steps.find((s) => s.id === "finance")).toBeUndefined();
    expect(view.signals.every((s) => !["invoice", "cost", "finance-entry"].includes(s.id))).toBe(true);
    expect(view.events.map((event) => event.source)).not.toContain("FINANCE");
    expect(view.events.map((event) => event.source)).not.toContain("INVOICE");
    expect(view.events.some((event) => event.source === "STOCK")).toBe(true);
  });
  it("keeps FBO as a reference and orders trace events newest first", () => {
    const fbo = order({ fulfillment: "FBO" });
    const data = snapshot("ADMIN", { audit: [{id:"a1",reference:"o1",action:"IMPORT",actor:"demo",details:{},created_at:"2026-10-21T14:00:00Z"}] });
    const view = order360View(fbo, data);
    expect(view.steps.slice(1).every((s) => s.state === "NOT_APPLICABLE")).toBe(true);
    expect(view.signals).toHaveLength(0);
    expect(view.events.map((e) => e.source)).toEqual(["AUDIT", "ORDER"]);
  });
});
