import { packingShortages } from "./packing";
import type { Order, WorkspaceSnapshot } from "../types";

export type Order360StepState = "DONE" | "CURRENT" | "PENDING" | "NOT_APPLICABLE";
export type Order360Area = "products" | "operations" | "finance" | "trace";
export type Order360Source =
  | "ORDER"
  | "AUDIT"
  | "STOCK"
  | "FINANCE"
  | "INVOICE"
  | "RETURN"
  | "INTEGRATION";

export interface Order360Step {
  id: string;
  label: string;
  state: Order360StepState;
  detail: string;
}
export interface Order360Signal {
  id: string;
  level: "ATTENTION" | "NEXT";
  title: string;
  detail: string;
  area: Order360Area;
}
export interface Order360Event {
  id: string;
  source: Order360Source;
  time: string;
  title: string;
  description: string;
  amount?: { value: number; currency: "RUB" | "TRY" };
}
export interface Order360View {
  steps: Order360Step[];
  signals: Order360Signal[];
  events: Order360Event[];
}

export function order360View(order: Order, data: WorkspaceSnapshot): Order360View {
  const fbs = order.fulfillment === "FBS";
  const financeAllowed = data.actor.role !== "WAREHOUSE";
  const invoice = data.invoices.find((item) => item.order_id === order.id);
  const recordedInvoice = Boolean(invoice || order.invoice_id);
  const invoiceStatus = invoice?.status ?? order.invoice_status;
  const financial = financeAllowed
    ? data.financial.filter((item) => item.order_id === order.id)
    : [];
  const reserved = [
    "RESERVED", "PACKING", "READY", "SHIPPED", "RETURN_PENDING", "RETURNED",
  ].includes(order.status);
  const total = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const packed = order.lines.reduce((sum, line) => sum + line.packed, 0);
  const shipped = Boolean(order.shipped_at);
  const closed = order.status === "CANCELLED" || order.status === "RETURNED";
  const steps: Order360Step[] = [
    { id: "order", label: "Sipariş", state: "DONE", detail: "Kayıt oluşturuldu" },
    {
      id: "reserve", label: "Rezervasyon",
      state: !fbs ? "NOT_APPLICABLE" : reserved ? "DONE" : closed ? "NOT_APPLICABLE" : order.status === "NEW" ? "CURRENT" : "PENDING",
      detail: !fbs ? "FBO referansı" : reserved ? "Durum kaydı mevcut" : "Fiziksel stok çıkışı değildir",
    },
    {
      id: "pack", label: "Barkod",
      state: !fbs ? "NOT_APPLICABLE" : total > 0 && packed === total ? "DONE" : ["RESERVED", "PACKING"].includes(order.status) ? "CURRENT" : closed ? "NOT_APPLICABLE" : "PENDING",
      detail: !fbs ? "Yerel hazırlama yok" : String(packed) + "/" + String(total) + " adet doğrulandı",
    },
    {
      id: "ship", label: "Sevkiyat",
      state: !fbs ? "NOT_APPLICABLE" : shipped ? "DONE" : order.status === "READY" ? "CURRENT" : closed ? "NOT_APPLICABLE" : "PENDING",
      detail: !fbs ? "FBO referansı" : shipped ? "Sevk tarihi kayıtlı" : "Manuel onay gerekir",
    },
    {
      id: "invoice", label: "Belge",
      state: !fbs ? "NOT_APPLICABLE" : recordedInvoice && invoiceStatus !== "ERROR" && invoiceStatus !== "CANCELLED" ? "DONE" : (invoiceStatus === "ERROR" || invoiceStatus === "CANCELLED" || shipped) ? "CURRENT" : closed ? "NOT_APPLICABLE" : "PENDING",
      detail: !fbs ? "Yerel belge süreci yok" : recordedInvoice ? "DEMO / TASLAK · " + (invoiceStatus ?? "DRAFT") : "Taslak bulunmuyor",
    },
  ];
  if (financeAllowed) {
    steps.push({
      id: "finance", label: "Finans kaydı",
      state: !fbs ? "NOT_APPLICABLE" : financial.length > 0 ? "DONE" : shipped ? "CURRENT" : closed ? "NOT_APPLICABLE" : "PENDING",
      detail: !fbs ? "FBO referansı" : String(financial.length) + " finans hareketi; mutabakat onayı değildir",
    });
  }

  const signals: Order360Signal[] = [];
  const signal = (id: string, level: Order360Signal["level"], title: string, detail: string, area: Order360Area) =>
    signals.push({ id, level, title, detail, area });
  if (fbs && order.status === "NEW") {
    const shortages = packingShortages(order, data.products);
    if (shortages.length) {
      signal("shortage", "ATTENTION", "Rezervasyon engeli", String(shortages.length) + " kalemde stok eksik; ürün bakiyesini inceleyin.", "products");
    } else {
      signal("reserve", "NEXT", "Stok rezervasyonu", "Ürünler uygun görünüyor; rezervasyon onayı bekleniyor.", "operations");
    }
  }
  if (fbs && ["RESERVED", "PACKING"].includes(order.status) && packed < total) {
    signal("packing", "NEXT", "Barkod doğrulaması", String(total - packed) + " adet henüz doğrulanmadı.", "operations");
  }
  if (fbs && order.status === "READY") {
    signal("shipping", "NEXT", "Sevk onayı", "Barkod kontrolü tamamlandı; sevkiyat otomatik yapılmaz.", "operations");
  }
  if (fbs && order.status === "RETURN_PENDING") {
    signal("return", "ATTENTION", "İade kalite kontrolü", "Karantinadaki ürün için onay veya ret bekleniyor.", "operations");
  }
  if (fbs && ["SHIPPED", "RETURN_PENDING", "RETURNED"].includes(order.status)) {
    if (!shipped) signal("ship-date", "ATTENTION", "Sevk kaydı tutarsız", "Sipariş sevk durumunda fakat sevk tarihi yok.", "trace");
    if (financeAllowed && !recordedInvoice) {
      signal("invoice", "NEXT", "Belge taslağı eksik", "Sevk edilmiş siparişe bağlı DEMO / TASLAK belge bulunamadı.", "operations");
    }
    if (financeAllowed && invoiceStatus === "ERROR") {
      signal("invoice-error", "ATTENTION", "Belge hatası", invoice?.error ?? "Taslak belge hata durumunda.", "operations");
    }
    if (financeAllowed && invoiceStatus === "CANCELLED") {
      signal("invoice-cancelled", "ATTENTION", "Taslak belge iptal", "Belge geçmişini ve yeniden açma koşulunu inceleyin.", "trace");
    }
    if (financeAllowed) {
      const missingCost = order.lines.filter((line) =>
        line.unit_cost_try === null && order.cost_corrections?.[line.product_id] === undefined,
      ).length;
      if (missingCost) {
        signal("cost", "ATTENTION", "Maliyet eksik", String(missingCost) + " kalem için kesin katkı kârı hesaplanamaz.", "finance");
      }
      if (!financial.length) {
        signal("finance-entry", "ATTENTION", "Finans hareketi bulunamadı", "Sevk durumunu ve finans kayıtlarını karşılaştırın.", "trace");
      }
    }
  }

  const events: Order360Event[] = [
    {
      id: "order:" + order.id, source: "ORDER", time: order.created_at,
      title: "Sipariş oluşturuldu",
      description: order.fulfillment + " · " + String(order.lines.length) + " kalem",
    },
  ];
  for (const item of data.audit) {
    if (item.reference !== order.id) continue;
    const reason = typeof item.details?.reason === "string" ? item.details.reason : "";
    events.push({
      id: "audit:" + item.id, source: "AUDIT", time: item.created_at,
      title: item.action, description: (reason ? reason + " · " : "") + item.actor,
    });
  }
  for (const item of data.ledger) {
    if (item.reference !== order.id) continue;
    const sku = data.products.find((p) => p.id === item.product_id)?.sku ?? "Ürün bulunamadı";
    events.push({
      id: "ledger:" + item.id, source: "STOCK", time: item.created_at,
      title: "Stok hareketi · " + item.kind,
      description: sku + " · " + (item.quantity > 0 ? "+" : "") + item.quantity + " adet · " + item.warehouse_id,
    });
  }
  if (financeAllowed) {
    for (const item of financial) {
      events.push({
        id: "financial:" + item.id, source: "FINANCE", time: item.created_at,
        title: "Finans · " + item.kind, description: "Kayıt " + item.id,
        amount: { value: item.amount, currency: item.currency },
      });
    }
    for (const item of data.invoiceEvents ?? []) {
      if (item.order_id !== order.id) continue;
      events.push({
        id: "invoice-event:" + item.id, source: "INVOICE", time: item.created_at,
        title: "Belge · " + (item.from_status ?? "Yeni") + " → " + item.to_status,
        description: item.reason + " · " + item.actor,
      });
    }
    if (invoice) {
      events.push({
        id: "invoice:" + invoice.id, source: "INVOICE", time: invoice.created_at,
        title: "DEMO / TASLAK oluşturuldu", description: "Güncel belge durumu: " + invoice.status,
      });
    }
  }
  for (const item of data.returns) {
    if (item.order_id !== order.id) continue;
    events.push({
      id: "return:" + item.order_id, source: "RETURN", time: item.created_at,
      title: "İade kaydı", description: item.reason + " · " + item.status,
    });
    if (item.reviewed_at) {
      events.push({
        id: "qc:" + item.order_id, source: "RETURN", time: item.reviewed_at,
        title: "Kalite kontrol kararı", description: item.status,
      });
    }
  }
  for (const item of data.integrationEvents ?? []) {
    if (item.order_id !== order.id) continue;
    events.push({
      id: "integration:" + item.id, source: "INTEGRATION", time: item.created_at,
      title: item.provider + " · " + item.operation,
      description: "Demo sağlayıcı kaydı · Dış sisteme gönderilmedi",
    });
  }
  events.sort((a, b) => b.time.localeCompare(a.time) || a.id.localeCompare(b.id));
  return { steps, signals, events };
}
