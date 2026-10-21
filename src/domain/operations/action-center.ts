import { canOpenSection, type WorkspaceSection } from "../navigation";
import { packingShortages } from "../orders/packing";
import type { Order, WorkspaceSnapshot } from "../types";

export type TaskLane = "ISSUE" | "FULFILL" | "DOCUMENT" | "STOCK";
export interface OperationalTask {
  id: string;
  lane: TaskLane;
  priority: number;
  title: string;
  reason: string;
  action: string;
  target: WorkspaceSection;
  createdAt: string;
  orderId?: string;
  productId?: string;
  reference: string;
}

export function operationalTasks(data: WorkspaceSnapshot): OperationalTask[] {
  const tasks: OperationalTask[] = [];
  const role = data.actor.role;
  const products = new Map(data.products.map((p) => [p.id, p]));
  const invoices = new Map(data.invoices.map((i) => [i.order_id, i]));
  const addOrder = (
    order: Order,
    id: string,
    lane: TaskLane,
    priority: number,
    title: string,
    reason: string,
    action: string,
    target: WorkspaceSection,
    productId?: string,
  ) => {
    if (!canOpenSection(role, target)) return;
    tasks.push({
      id: id + ":" + order.id,
      lane,
      priority,
      title,
      reason,
      action,
      target,
      orderId: order.id,
      productId,
      reference: order.number,
      createdAt: order.created_at,
    });
  };

  for (const order of data.orders) {
    if (order.fulfillment !== "FBS") continue;
    const invoice = invoices.get(order.id);
    const invoiceStatus = invoice?.status ?? order.invoice_status;
    if (order.status === "NEW") {
      const shortages = packingShortages(order, data.products);
      if (shortages.length > 0) {
        const first = shortages[0];
        const p = products.get(first.productId);
        addOrder(
          order,
          "stock-block",
          "ISSUE",
          0,
          "Stok rezervasyonu engelli",
          (p?.sku ?? "Ürün") +
            " · " +
            first.missing +
            " adet eksik" +
            (shortages.length > 1
              ? " · " + shortages.length + " kalem etkileniyor"
              : ""),
          "Stoğu incele",
          "inventory",
          first.productId,
        );
      } else {
        addOrder(
          order,
          "reserve",
          "FULFILL",
          3,
          "Rezervasyon bekliyor",
          order.lines.length + " kalem · stok kontrolü yapılabilir",
          "Hazırlamaya geç",
          "packing",
        );
      }
    }
    if (order.status === "RESERVED" || order.status === "PACKING") {
      const packed = order.lines.reduce((n, l) => n + l.packed, 0);
      const total = order.lines.reduce((n, l) => n + l.quantity, 0);
      addOrder(
        order,
        "packing",
        "FULFILL",
        2,
        "Hazırlama devam ediyor",
        packed + " / " + total + " adet doğrulandı",
        "Hazırlamayı aç",
        "packing",
      );
    }
    if (order.status === "READY") {
      addOrder(
        order,
        "ready",
        "FULFILL",
        1,
        "Sevk onayı bekliyor",
        "Barkod doğrulaması tamamlandı; sevk manuel onaylanır",
        "Sevkiyata geç",
        "packing",
      );
    }
    if (order.status === "RETURN_PENDING") {
      addOrder(
        order,
        "return",
        "ISSUE",
        0,
        "İade kararı bekliyor",
        "Ürün karantinada; kalite kontrol kararı gerekli",
        "İadeyi incele",
        "returns",
      );
    }
    if (["SHIPPED", "RETURN_PENDING", "RETURNED"].includes(order.status)) {
      if (invoiceStatus === "ERROR") {
        addOrder(
          order,
          "invoice-error",
          "ISSUE",
          0,
          "Belge hatası",
          invoice?.error || "Fatura taslağı hata durumunda",
          "Fatura kuyruğunu aç",
          "invoices",
        );
      } else if (!order.invoice_id) {
        addOrder(
          order,
          "invoice-pending",
          "DOCUMENT",
          2,
          "Fatura taslağı eksik",
          "Sevk edilmiş sipariş için taslak belge bulunamadı",
          "Faturaya geç",
          "invoices",
        );
      }
      const missing = order.lines.filter((line) => {
        const corrected = order.cost_corrections?.[line.product_id];
        return line.unit_cost_try === null && corrected === undefined;
      }).length;
      if (missing > 0) {
        addOrder(
          order,
          "cost-missing",
          "DOCUMENT",
          2,
          "Maliyet bilgisi eksik",
          missing + " kalemin birim maliyeti tamamlanmalı",
          "Finansı incele",
          "finance",
        );
      }
    }
  }
  if (role !== "ACCOUNTANT") {
    for (const product of data.products) {
      if (product.active === false || product.available > product.threshold)
        continue;
      if (!canOpenSection(role, "inventory")) continue;
      tasks.push({
        id: "critical-stock:" + product.id,
        lane: "STOCK",
        priority: product.available === 0 ? 1 : 4,
        title: "Kritik stok",
        reason:
          product.available + " kullanılabilir · eşik " + product.threshold,
        action: "Stok kartını aç",
        target: "inventory",
        productId: product.id,
        reference: product.sku,
        createdAt: "",
      });
    }
  }
  const priorityOrder: Record<TaskLane, number> = {
    ISSUE: 0,
    FULFILL: 1,
    DOCUMENT: 2,
    STOCK: 3,
  };
  return tasks.sort(
    (a, b) =>
      a.priority - b.priority ||
      priorityOrder[a.lane] - priorityOrder[b.lane] ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}
