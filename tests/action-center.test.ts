import { describe, expect, it } from "vitest";
import { operationalTasks } from "../src/domain/operations/action-center";
import type {
  Order,
  Product,
  Role,
  WorkspaceSnapshot,
} from "../src/domain/types";

const product = (overrides: Partial<Product> = {}): Product => ({
  id: "p1",
  sku: "SKU-1",
  name: "Test ürün",
  variant: "Kırmızı",
  barcode: "123",
  category: "Test",
  cost_try: 200,
  price_rub: 800,
  physical: 12,
  reserved: 0,
  available: 12,
  quarantine: 0,
  threshold: 2,
  ...overrides,
});
const order = (overrides: Partial<Order> = {}): Order => ({
  id: "o1",
  number: "FBS-001",
  customer: "Örnek müşteri",
  fulfillment: "FBS",
  status: "NEW",
  currency: "RUB",
  created_at: "2026-10-01T10:00:00.000Z",
  shipped_at: null,
  fx_date: "2026-10-01",
  fx_rate: 0.5,
  commission_bps: 1000,
  logistics: 50,
  lines: [
    {
      order_id: "o1",
      product_id: "p1",
      quantity: 2,
      packed: 0,
      unit_price: 800,
      unit_cost_try: 200,
    },
  ],
  total: 1600,
  ...overrides,
});
const snapshot = (
  role: Role,
  orders: Order[],
  products: Product[] = [product()],
  invoices: WorkspaceSnapshot["invoices"] = [],
): WorkspaceSnapshot => ({
  actor: { role, userId: "test-user", workspaceId: "test-workspace" },
  workspace: {
    id: "test-workspace",
    name: "Test",
    generation: 1,
    settings: {},
  },
  products,
  orders,
  invoices,
  returns: [],
  users: [],
  ledger: [],
  financial: [],
  audit: [],
});

describe("operational action center", () => {
  it("blocks NEW stock shortage and routes to a real product without promising a shipment", () => {
    const p = product({ available: 1, physical: 1 });
    const tasks = operationalTasks(snapshot("WAREHOUSE", [order()], [p]));
    expect(tasks[0]).toMatchObject({
      id: "stock-block:o1",
      lane: "ISSUE",
      target: "inventory",
      productId: "p1",
    });
    expect(tasks[0].reason).toContain("1 adet eksik");
    expect(tasks.some((t) => t.id === "reserve:o1")).toBe(false);
    expect(tasks.every((t) => !t.reason.includes("gecikmiş"))).toBe(true);
  });
  it("handles reserved, packing and ready orders separately without mutating them", () => {
    const orders = [
      order({ id: "a", number: "A", status: "RESERVED" }),
      order({ id: "b", number: "B", status: "PACKING" }),
      order({ id: "c", number: "C", status: "READY" }),
    ];
    const tasks = operationalTasks(snapshot("ADMIN", orders));
    expect(tasks.map((t) => t.id).sort()).toEqual([
      "packing:a",
      "packing:b",
      "ready:c",
    ]);
    expect(tasks.find((t) => t.id === "ready:c")?.action).toBe("Sevkiyata geç");
    expect(orders[2].status).toBe("READY");
  });
  it("separates failed documents, missing invoice drafts and missing costs", () => {
    const sent = order({
      id: "sent",
      number: "SENT",
      status: "SHIPPED",
      invoice_id: "i1",
      invoice_status: "ERROR",
      lines: [
        {
          order_id: "sent",
          product_id: "p1",
          quantity: 1,
          packed: 1,
          unit_price: 800,
          unit_cost_try: null,
        },
      ],
    });
    const pending = order({
      id: "pending",
      number: "PENDING",
      status: "SHIPPED",
    });
    const tasks = operationalTasks(
      snapshot(
        "ADMIN",
        [sent, pending],
        [product()],
        [
          {
            id: "i1",
            order_id: "sent",
            status: "ERROR",
            label: "DEMO / TASLAK",
            created_at: sent.created_at,
            error: "İşlem hatası",
          },
        ],
      ),
    );
    expect(
      tasks.some((t) => t.id === "invoice-error:sent" && t.lane === "ISSUE"),
    ).toBe(true);
    expect(
      tasks.some((t) => t.id === "cost-missing:sent" && t.target === "finance"),
    ).toBe(true);
    expect(tasks.some((t) => t.id === "invoice-pending:pending")).toBe(true);
    expect(tasks.some((t) => t.id === "invoice-pending:sent")).toBe(false);
  });
  it("uses cost corrections instead of treating historical missing cost as unsolved", () => {
    const sent = order({
      status: "SHIPPED",
      lines: [
        {
          order_id: "o1",
          product_id: "p1",
          quantity: 1,
          packed: 1,
          unit_price: 800,
          unit_cost_try: null,
        },
      ],
      cost_corrections: { p1: 210 },
    });
    const tasks = operationalTasks(snapshot("ADMIN", [sent]));
    expect(tasks.some((t) => t.id.startsWith("cost-missing:"))).toBe(false);
  });
  it("enforces the same section permissions before showing tasks", () => {
    const all = [
      order({ id: "new", status: "NEW" }),
      order({ id: "return", status: "RETURN_PENDING" }),
      order({ id: "shipped", status: "SHIPPED" }),
    ];
    const warehouse = operationalTasks(
      snapshot("WAREHOUSE", all, [product({ available: 0 })]),
    );
    expect(
      warehouse.some((t) => t.target === "finance" || t.target === "invoices"),
    ).toBe(false);
    const accounting = operationalTasks(
      snapshot("ACCOUNTANT", all, [product({ available: 0 })]),
    );
    expect(
      accounting.every(
        (t) =>
          t.target !== "packing" &&
          t.target !== "returns" &&
          t.lane !== "STOCK",
      ),
    ).toBe(true);
    expect(accounting.some((t) => t.id === "invoice-pending:shipped")).toBe(
      true,
    );
  });
  it("does not imply FBO orders can be prepared or shipped", () => {
    const tasks = operationalTasks(
      snapshot("ADMIN", [order({ fulfillment: "FBO" })]),
    );
    expect(tasks).toHaveLength(0);
  });
  it("displays critical stock in stock module only for permitted roles", () => {
    const p = product({ available: 2, threshold: 3 });
    expect(operationalTasks(snapshot("ADMIN", [], [p]))[0]).toMatchObject({
      id: "critical-stock:p1",
      target: "inventory",
    });
    expect(operationalTasks(snapshot("ACCOUNTANT", [], [p]))).toHaveLength(0);
  });
});
