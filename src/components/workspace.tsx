"use client";
import { requestId } from "@/domain/request-id";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingBag,
  ChevronRight,
  Boxes,
  FileText,
  ChartNoAxesCombined,
  Settings,
  Search,
  ArrowUpRight,
  Plus,
  PackageCheck,
  ScanBarcode,
  RotateCcw,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  WorkspaceSnapshot,
  Order,
  Product,
  Role,
  Ledger,
  User,
} from "@/domain/types";
import { statusLabels, roleLabels } from "@/domain/types";
import { permissions, type Action } from "@/domain/permissions";
import type { Command } from "@/domain/orders/commands";
import { profitability } from "@/domain/finance/calculations";
import { DataTable } from "./data-table";
import { lineContributions } from "@/domain/finance/allocation";
import { PackingWorkbench } from "./packing-workbench";
import { OrdersView } from "./orders-view";
import { WorkspaceHeader } from "./workspace-header";
import { GuidedTour } from "./guided-tour";
import { workspaceGuide } from "@/domain/onboarding";
import "./workspace-design.css";
import { ReturnsWorkbench } from "./returns-workbench";
import { InvoiceWorkbench } from "./invoice-workbench";
import { CostCorrections } from "./cost-corrections";
import { reportData, type FinancialDateMode } from "@/domain/finance/reporting";
import { InventoryDocuments } from "./inventory-documents";
import { CatalogTools, ProductEditor, ProductSource } from "./catalog-tools";
import { OzonMarketPanel } from "./ozon-market-panel";
import { ActionCenter } from "./action-center";
import { Order360Overview, Order360Trace } from "./order-360";
import {
  CurrencyDisplayProvider,
  CurrencyDisplayControls,
  displayMoney,
} from "./currency-display";
import { type WorkspaceSection as Section } from "@/domain/navigation";
const nav = [
  { id: "dashboard", name: "Operasyon Merkezi", icon: LayoutDashboard },
  { id: "orders", name: "Siparişler", icon: ShoppingBag },
  { id: "packing", name: "Hazırlama Masası", icon: ScanBarcode },
  { id: "inventory", name: "Stok & Depo", icon: Boxes },
  { id: "returns", name: "İade & Kalite Kontrol", icon: RotateCcw },
  { id: "invoices", name: "Fatura Merkezi", icon: FileText },
  { id: "finance", name: "Finans & Analitik", icon: ChartNoAxesCombined },
  { id: "settings", name: "Sistem Yönetimi", icon: Settings },
] as const;
const money = (n: number, currency = "RUB") =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n / 100);
const date = (v: string) =>
  new Date(v).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const today = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      {statusLabels[status as keyof typeof statusLabels] ??
        {
          DRAFT: "Taslak",
          ERROR: "Hata",
          PENDING: "Kontrol bekliyor",
          ACCEPTED: "Onaylandı",
          REJECTED: "Reddedildi",
        }[status] ??
        status}
    </span>
  );
}
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "İşlem başarısız");
  return data;
}
function WorkspaceBody({
  initialSection = "dashboard",
}: {
  initialSection?: Section;
}) {
  const [data, setData] = useState<WorkspaceSnapshot | null>(null),
    [section, setSection] = useState<Section>(initialSection),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [stockFilter, setStockFilter] = useState("ALL"),
    [currency, setCurrency] = useState<"RUB" | "TRY">("RUB"),
    [from, setFrom] = useState(() =>
      new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(today);
  const [orderViewSlot, setOrderViewSlot] = useState<HTMLDivElement | null>(
    null,
  );
  const [packingOrderId, setPackingOrderId] = useState<string | null>(null);
  const [guideReplay, setGuideReplay] = useState(0);
  const [financeMode, setFinanceMode] = useState<FinancialDateMode>("COHORT");
  const [orderId, setOrderId] = useState<string | null>(null),
    [productId, setProductId] = useState<string | null>(null),
    [creating, setCreating] = useState(false),
    [barcode, setBarcode] = useState(""),
    [reason, setReason] = useState(""),
    [formLines, setFormLines] = useState([{ productId: "p1", quantity: 1 }]);
  const searchRef = useRef<HTMLInputElement>(null),
    barcodeRef = useRef<HTMLInputElement>(null),
    closeRef = useRef<HTMLButtonElement>(null),
    openerRef = useRef<HTMLElement | null>(null);
  const load = useCallback(async () => {
    try {
      const s = await api<WorkspaceSnapshot>("/api/workspace");
      setData(s);
    } catch (e) {
      if ((e as Error).message !== "Demo oturumu açın")
        setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    api<WorkspaceSnapshot>("/api/workspace")
      .then((s) => {
        if (active) setData(s);
      })
      .catch((e) => {
        if (active && e.message !== "Demo oturumu açın") setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOrderId(null);
        setProductId(null);
        setCreating(false);
        document
          .querySelectorAll<HTMLDetailsElement>(".design-ledger details[open]")
          .forEach((menu) => {
            menu.open = false;
            menu.querySelector("summary")?.focus();
          });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    function dismissMenus(event: PointerEvent) {
      document
        .querySelectorAll<HTMLDetailsElement>(
          ".workspace-menu[open], .order-filter-popover[open], .table-column-picker[open], .currency-popover[open]",
        )
        .forEach((menu) => {
          if (event.target instanceof Node && !menu.contains(event.target))
            menu.open = false;
        });
    }
    document.addEventListener("pointerdown", dismissMenus);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", dismissMenus);
    };
  }, []);
  useEffect(() => {
    if (orderId || productId || creating) {
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      closeRef.current?.focus();
      return () => {
        document.body.style.overflow = overflow;
        openerRef.current?.focus();
      };
    }
  }, [orderId, productId, creating]);
  const allowed = (action: Action) =>
    data && (permissions[action] as readonly Role[]).includes(data.actor.role);
  async function run(command: Command, quiet = false) {
    if (!data) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ reference: string }>("/api/command", {
        method: "POST",
        body: JSON.stringify({
          key: requestId(),
          generation: data.workspace.generation,
          command,
        }),
      });
      if (!quiet) {
        await load();
        setNotice("İşlem kaydedildi. İlgili kayıtlar güncellendi.");
      }
      return result;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  function openOrder(id: string) {
    openerRef.current = document.activeElement as HTMLElement;
    setOrderId(id);
  }
  function openProduct(id: string) {
    openerRef.current = document.activeElement as HTMLElement;
    setProductId(id);
  }
  function openCreate() {
    openerRef.current = document.activeElement as HTMLElement;
    setCreating(true);
  }
  function act(c: Command) {
    void run(c).catch(() => {});
  }
  function navigate(next: Section) {
    setSection(next);
    window.history.replaceState(null, "", `/workspace?section=${next}`);
    setSearch("");
    setStatus("ALL");
    requestAnimationFrame(() => {
      document
        .getElementById("workspace-heading")
        ?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }
  if (loading)
    return (
      <div className="app-shell design-ledger">
        <header className="ledger-header">
          <span className="ledger-brand">
            marketplace<strong>OS</strong>
          </span>
          <span className="ledger-demo">DEMO</span>
        </header>
        <main className="workspace-main" aria-busy="true">
          <p role="status">Çalışma alanı yükleniyor…</p>
        </main>
      </div>
    );
  if (!data)
    return (
      <main className="workspace-unavailable">
        <div className="brand-mark">M</div>
        <h1>Çalışma alanı açılamadı</h1>
        <p role={error ? "alert" : undefined}>
          {error ||
            "Oturumunuz sona ermiş olabilir. Demo Merkezi’nden yeniden giriş yapın."}
        </p>
        <Link className="button primary" href="/">
          Demo Merkezi’ne dön
        </Link>
      </main>
    );
  const dateMode = section === "finance" ? financeMode : "COHORT";
  const period = reportData(data, currency, from, to, dateMode);
  const orders =
    section === "finance"
      ? period.orders
      : data.orders.filter(
          (o) =>
            o.created_at.slice(0, 10) >= from &&
            o.created_at.slice(0, 10) <= to,
        );
  const ids = new Set(period.orders.map((o) => o.id)),
    entries = period.entries,
    summary = period.summary;
  const span = Math.max(
      1,
      Math.floor(
        (new Date(to).getTime() - new Date(from).getTime()) / 86400000,
      ) + 1,
    ),
    previousTo = new Date(new Date(from).getTime() - 86400000)
      .toISOString()
      .slice(0, 10),
    previousFrom = new Date(new Date(from).getTime() - span * 86400000)
      .toISOString()
      .slice(0, 10);
  const previousSummary = reportData(
    data,
    currency,
    previousFrom,
    previousTo,
    dateMode,
  ).summary;
  const incomplete = period.incomplete;
  const low = data.products.filter((p) => p.available <= p.threshold);
  const products = data.products.filter(
    (p) =>
      [p.name, p.sku, p.barcode, p.variant]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(search.toLocaleLowerCase("tr")) &&
      (stockFilter === "ALL" ||
        (stockFilter === "LOW" && p.available <= p.threshold) ||
        (stockFilter === "QUARANTINE" && p.quarantine > 0) ||
        (stockFilter === "OZON" && p.source?.provider === "OZON_PUBLIC") ||
        (stockFilter === "INACTIVE" && p.active === false)),
  );
  const order = data.orders.find((o) => o.id === orderId),
    product = data.products.find((p) => p.id === productId);
  const orderColumns: ColumnDef<Order>[] = [
    {
      accessorKey: "number",
      header: "Sipariş",
      cell: ({ row }) => (
        <div>
          <button
            className="text-link"
            onClick={() => openOrder(row.original.id)}
          >
            {row.original.number}
          </button>
          <small>{row.original.customer}</small>
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Tarih",
      cell: ({ getValue }) => date(getValue<string>()),
    },
    {
      accessorKey: "fulfillment",
      header: "Model",
      cell: ({ getValue }) => (
        <span className="model">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Durum",
      cell: ({ getValue }) => <Badge status={getValue<string>()} />,
    },
    {
      id: "items",
      header: "Ürün / Adet",
      accessorFn: (o) => o.lines.reduce((s, l) => s + l.quantity, 0),
      cell: ({ row, getValue }) => (
        <span>
          {row.original.lines.length} SKU / {getValue<number>()} adet
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: "Sipariş tutarı",
      cell: ({ row }) => (
        <strong className="numeric">
          {displayMoney(row.original.total, row.original.currency)}
        </strong>
      ),
    },
    {
      id: "invoice",
      header: "Fatura",
      accessorFn: (o) => o.invoice_status ?? "Bekliyor",
      cell: ({ row }) =>
        row.original.invoice_status ? (
          <Badge status={row.original.invoice_status} />
        ) : (
          <span className="muted">—</span>
        ),
    },
  ];
  const productColumns: ColumnDef<Product>[] = [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <button
          className="text-link"
          onClick={() => openProduct(row.original.id)}
        >
          {row.original.sku}
        </button>
      ),
    },
    {
      accessorKey: "name",
      header: "Ürün",
      cell: ({ row }) => (
        <div>
          <strong>{row.original.name}</strong>
          <span className="catalog-status">
            {row.original.active === false ? "Pasif" : "Aktif"}
          </span>
          <ProductSource product={row.original} />
          <small>
            {row.original.variant} · {row.original.category}
          </small>
        </div>
      ),
    },
    { accessorKey: "barcode", header: "Barkod" },
    {
      accessorKey: "price_rub",
      header: "Örnek fiyat (RUB)",
      cell: ({ getValue }) => displayMoney(getValue<number>(), "RUB"),
    },
    { accessorKey: "physical", header: "Fiziksel" },
    { accessorKey: "reserved", header: "Rezerve" },
    {
      accessorKey: "available",
      header: "Kullanılabilir",
      cell: ({ row }) => (
        <strong
          className={
            row.original.available <= row.original.threshold
              ? "danger-text"
              : "numeric"
          }
        >
          {row.original.available}
        </strong>
      ),
    },
    { accessorKey: "quarantine", header: "Karantina" },
    { accessorKey: "threshold", header: "Kritik eşik" },
  ];
  const trend = Array.from(
    {
      length: Math.min(
        366,
        Math.max(
          0,
          Math.floor(
            (new Date(to).getTime() - new Date(from).getTime()) / 86400000,
          ) + 1,
        ),
      ),
    },
    (_, i) => {
      const day = new Date(new Date(from).getTime() + i * 86400000)
        .toISOString()
        .slice(0, 10);
      return {
        day: day.slice(5),
        gross:
          entries
            .filter(
              (e) =>
                e.kind === "SALE" &&
                (dateMode === "MOVEMENT"
                  ? e.created_at.slice(0, 10)
                  : data.orders
                      .find((o) => o.id === e.order_id)
                      ?.created_at.slice(0, 10)) === day,
            )
            .reduce((s, e) => s + e.amount, 0) / 100,
      };
    },
  );
  const queue = data.orders.filter(
    (o) =>
      o.fulfillment === "FBS" &&
      ["NEW", "RESERVED", "PACKING", "READY", "RETURN_PENDING"].includes(
        o.status,
      ),
  );
  const progress = order ? order.lines.reduce((s, l) => s + l.packed, 0) : 0,
    totalUnits = order ? order.lines.reduce((s, l) => s + l.quantity, 0) : 0;
  const financialOrder = order ? profitability(order, data.financial) : null;
  return (
    <div className="app-shell design-ledger">
      <div className="main-shell" inert={!!(order || product || creating)}>
        <a className="workspace-skip" href="#workspace-content">
          İçeriğe geç
        </a>
        <WorkspaceHeader
          data={data}
          section={section}
          busy={busy}
          onNavigate={navigate}
          onGuide={() => setGuideReplay((value) => value + 1)}
          onRefresh={() => void load()}
          onLogout={() => {
            void api("/api/session", { method: "DELETE" })
              .then(() => {
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- A closed session discards privileged client state.
                window.location.assign("/");
              })
              .catch((e: Error) => setError(e.message));
          }}
        />
        <main
          id="workspace-content"
          className="workspace-main"
          data-section={section}
        >
          <div className="page-heading">
            <div>
              <h1 id="workspace-heading" tabIndex={-1}>
                {nav.find((n) => n.id === section)?.name}
              </h1>
              {section === "orders" && (
                <div id="order-view-slot" ref={setOrderViewSlot} />
              )}
            </div>
            <div className="heading-actions">
              {["dashboard", "finance", "inventory"].includes(section) && (
                <CurrencyDisplayControls />
              )}

              {["finance", "dashboard"].includes(section) &&
                allowed("REPORT") && (
                  <a
                    className="button"
                    href={`/api/export?format=xlsx&currency=${currency}&from=${from}&to=${to}&mode=${dateMode}`}
                  >
                    Excel raporu ↗
                  </a>
                )}
              {["orders", "dashboard"].includes(section) &&
                allowed("CREATE_ORDER") && (
                  <button className="primary" onClick={openCreate}>
                    <Plus size={17} />
                    Yeni sipariş
                  </button>
                )}
            </div>
          </div>
          {error && (
            <div className="alert error" role="alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Hatayı kapat">
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              <CheckCircle2 size={18} />
              {notice}
              <button
                onClick={() => setNotice("")}
                aria-label="Bildirimi kapat"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {["dashboard", "finance"].includes(section) && (
            <div className="period-toolbar">
              <div>
                <Clock size={16} />
                <label>
                  Başlangıç
                  <input
                    aria-label="Başlangıç tarihi"
                    type="date"
                    value={from}
                    onChange={(e) => {
                      if (e.target.value) setFrom(e.target.value);
                    }}
                  />
                </label>
                <span>—</span>
                <label>
                  Bitiş
                  <input
                    aria-label="Bitiş tarihi"
                    type="date"
                    value={to}
                    onChange={(e) => {
                      if (e.target.value) setTo(e.target.value);
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    setFrom(today());
                    setTo(today());
                  }}
                >
                  Bugün
                </button>
                <button
                  onClick={() => {
                    setFrom(
                      new Date(Date.now() - 29 * 86400000)
                        .toISOString()
                        .slice(0, 10),
                    );
                    setTo(today());
                  }}
                >
                  Son 30 gün
                </button>
              </div>
              {section !== "orders" && (
                <select
                  aria-label="Kaynak kayıtların para birimi"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "RUB" | "TRY")}
                >
                  <option value="RUB">Ruble kayıtları (RUB)</option>
                  <option value="TRY">Türk lirası kayıtları (TRY)</option>
                </select>
              )}
            </div>
          )}
          {section === "dashboard" && (
            <>
              <ActionCenter
                data={data}
                busy={busy}
                onOpenOrder={openOrder}
                onAction={(task) => {
                  navigate(task.target);
                  if (task.target === "packing" && task.orderId) {
                    setPackingOrderId(task.orderId);
                  }
                  if (task.target === "inventory" && task.productId) {
                    openProduct(task.productId);
                  }
                }}
              />
              <details className="dashboard-insights">
                <summary>
                  Analizleri, son siparişleri ve Ozon pazar verilerini göster
                </summary>
                <div className="dashboard-insights-content">
                  <div className="metrics">
                    {[
                      {
                        label: "Net satış",
                        value:
                          data.actor.role === "WAREHOUSE"
                            ? "Yetkili görünümü"
                            : displayMoney(summary.net, currency),
                        sub: `${orders.filter((o) => ids.has(o.id)).length} sipariş · seçili dönem`,
                        icon: ChartNoAxesCombined,
                      },
                      {
                        label: "Hazırlama kuyruğu",
                        value: queue.filter((o) =>
                          ["RESERVED", "PACKING"].includes(o.status),
                        ).length,
                        sub: "Rezerve + hazırlanıyor · tüm dönem",
                        icon: PackageCheck,
                      },
                      {
                        label: "Sevke hazır",
                        value: queue.filter((o) => o.status === "READY").length,
                        sub: "Barkod doğrulaması tamamlandı",
                        icon: Truck,
                      },
                      {
                        label: "Kritik stok",
                        value: low.length,
                        sub: "Kullanılabilir stok ≤ kritik eşik",
                        icon: AlertTriangle,
                      },
                    ].map((m) => (
                      <article className="metric" key={m.label}>
                        <div>
                          <span>{m.label}</span>
                          <m.icon size={17} />
                        </div>
                        <strong>{m.value}</strong>
                        <small>{m.sub}</small>
                      </article>
                    ))}
                  </div>
                  <OzonMarketPanel
                    compact
                    onViewAll={() => navigate("inventory")}
                  />
                  <div className="dashboard-grid">
                    <section className="panel sales-chart">
                      <div className="panel-heading">
                        <div>
                          <h2>Satış görünümü</h2>
                          <p>
                            Sevk edilmiş siparişlerin brüt tutarı · {currency}
                          </p>
                        </div>
                        <span className="subtle-pill">
                          {from} / {to}
                        </span>
                      </div>
                      {data.actor.role === "WAREHOUSE" ? (
                        <div className="empty">
                          Finans görünümü için muhasebe veya yönetici rolü
                          gerekir.
                        </div>
                      ) : (
                        <div className="chart">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={trend}
                              margin={{
                                top: 15,
                                right: 15,
                                left: 5,
                                bottom: 0,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 4"
                                vertical={false}
                                stroke="#e8edf3"
                              />
                              <XAxis
                                dataKey="day"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={35}
                              />
                              <YAxis
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                width={60}
                              />
                              <Tooltip
                                formatter={(v) =>
                                  money(Number(v) * 100, currency)
                                }
                              />
                              <Area
                                type="monotone"
                                dataKey="gross"
                                name="Brüt satış"
                                stroke="#2473db"
                                fill="#e8f1fe"
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      <div className="chart-summary">
                        <div>
                          <span>Yeni sipariş</span>
                          <strong>
                            {orders.filter((o) => o.status === "NEW").length}
                          </strong>
                        </div>
                        <div>
                          <span>Sevk edildi</span>
                          <strong>
                            {
                              orders.filter((o) => o.status === "SHIPPED")
                                .length
                            }
                          </strong>
                        </div>
                        <div>
                          <span>Fatura bekliyor</span>
                          <strong>
                            {
                              orders.filter(
                                (o) => o.status === "SHIPPED" && !o.invoice_id,
                              ).length
                            }
                          </strong>
                        </div>
                      </div>
                    </section>
                    <section className="panel health">
                      <div className="panel-heading">
                        <div>
                          <h2>İşlem kuyruğu</h2>
                          <p>Önceliklendirilmiş operasyon işleri</p>
                        </div>
                        <span className="count">{queue.length}</span>
                      </div>
                      {[
                        {
                          status: "NEW",
                          label: "Rezervasyon bekleyen",
                          description: "Stok kontrolü ve tahsis",
                          icon: ShoppingBag,
                        },
                        {
                          status: "READY",
                          label: "Sevk edilmeye hazır",
                          description: "Depo doğrulaması tamam",
                          icon: Truck,
                        },
                        {
                          status: "RETURN_PENDING",
                          label: "İade kalite kontrol",
                          description: "Karantinada bekleyen siparişler",
                          icon: PackageCheck,
                        },
                      ].map((q) => (
                        <button
                          className="queue-item"
                          key={q.status}
                          onClick={() => {
                            navigate("orders");
                            setStatus(q.status);
                          }}
                        >
                          <span className="queue-icon">
                            <q.icon size={19} />
                          </span>
                          <div>
                            <strong>{q.label}</strong>
                            <small>{q.description}</small>
                          </div>
                          <b>
                            {
                              data.orders.filter(
                                (o) =>
                                  o.status === q.status &&
                                  o.fulfillment === "FBS",
                              ).length
                            }
                          </b>
                          <ChevronRight size={15} />
                        </button>
                      ))}
                    </section>
                  </div>
                  <div className="section-heading">
                    <h2>Son siparişler</h2>
                    <button
                      className="text-link"
                      onClick={() => navigate("orders")}
                    >
                      Tüm siparişler <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <DataTable
                    data={orders.slice(0, 8)}
                    columns={orderColumns}
                    onOpen={(o) => openOrder(o.id)}
                    label="Son siparişler"
                  />
                </div>
              </details>
            </>
          )}
          {section === "orders" && (
            <OrdersView
              key={`${data.workspace.id}:${data.actor.userId}:${data.workspace.generation}`}
              data={data}
              columns={orderColumns}
              viewSlot={orderViewSlot}
              onOpen={(o) => openOrder(o.id)}
              onPrepare={(o) => {
                setPackingOrderId(o.id);
                navigate("packing");
              }}
              initialStatus={status !== "ALL" ? status : undefined}
              busy={busy}
              onBulkBusy={setBusy}
              onRefresh={load}
            />
          )}
          {section === "packing" && allowed("SCAN") && (
            <PackingWorkbench
              key={packingOrderId ?? "queue"}
              initialOrderId={packingOrderId}
              data={data}
              busy={busy}
              onCommand={run}
              onOpen={openOrder}
            />
          )}
          {section === "returns" && allowed("QC") && (
            <ReturnsWorkbench
              key={`${data.workspace.id}:${data.actor.userId}:${data.workspace.generation}`}
              data={data}
              busy={busy}
              onCommand={run}
              onOpen={openOrder}
              onRefresh={load}
            />
          )}
          {section === "inventory" && (
            <>
              <OzonMarketPanel />
              <CatalogTools
                data={data}
                busy={busy}
                run={run}
                onCreated={openProduct}
              />
              <div className="inventory-summary">
                <span>
                  <Boxes size={18} />
                  <b>{data.products.length}</b> SKU
                </span>
                <span>
                  <b>{data.products.reduce((s, p) => s + p.physical, 0)}</b>{" "}
                  Fiziksel
                </span>
                <span>
                  <b>{data.products.reduce((s, p) => s + p.reserved, 0)}</b>{" "}
                  Rezerve
                </span>
                <span>
                  <b>{data.products.reduce((s, p) => s + p.quarantine, 0)}</b>{" "}
                  Karantina
                </span>
                <span className="danger-text">
                  <b>{low.length}</b> Kritik SKU
                </span>
              </div>
              <div className="filterbar">
                <div className="search-field">
                  <Search size={17} />
                  <input
                    ref={searchRef}
                    aria-label="Ürün ara"
                    placeholder="Ürün, SKU, varyant veya barkod…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Stok filtresi"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                >
                  <option value="ALL">Tüm ürünler</option>
                  <option value="LOW">Kritik stok</option>
                  <option value="OZON">Ozon referanslı ürünler</option>
                  <option value="INACTIVE">Pasif ürünler</option>
                  <option value="QUARANTINE">Karantinada stok</option>
                </select>
                <span className="muted">
                  Ana depo · FBO hareketi desteklenmiyor
                </span>
              </div>
              <DataTable
                data={products}
                columns={productColumns}
                onOpen={(p) => openProduct(p.id)}
                label="Stok ve depo"
              />
              <InventoryDocuments
                key={data.workspace.generation}
                data={data}
                busy={busy}
                run={run}
              />
            </>
          )}
          {section === "invoices" && (
            <InvoiceWorkbench
              key={data.workspace.generation}
              data={data}
              busy={busy}
              run={run}
              reload={load}
              onOpen={openOrder}
            />
          )}
          {section === "finance" && (
            <>
              <div className="filterbar">
                <label>
                  Finans tarih modu
                  <select
                    value={financeMode}
                    onChange={(e) =>
                      setFinanceMode(e.target.value as FinancialDateMode)
                    }
                  >
                    <option value="COHORT">Sipariş tarihi kohortu</option>
                    <option value="MOVEMENT">Finans hareket tarihi</option>
                  </select>
                </label>
                <details className="finance-note">
                  <summary>Tarih modları</summary>
                  <p>
                    UTC günü kullanılır. Kohort: seçili tarihte açılan
                    siparişlerin tüm hareketleri. Hareket: seçili tarihteki
                    finans kayıtları.
                  </p>
                </details>
              </div>
              <div className="metrics">
                {[
                  { label: "Brüt satış", value: summary.gross },
                  { label: "İadeler", value: summary.refunds },
                  { label: "Net satış", value: summary.net },
                  {
                    label:
                      "Katkı kârı" + (incomplete ? " • eksik maliyet" : ""),
                    value: summary.contribution,
                  },
                ].map((m) => (
                  <article className="metric" key={m.label}>
                    <div>
                      <span>{m.label}</span>
                      <ChartNoAxesCombined size={17} />
                    </div>
                    <strong>{displayMoney(m.value, currency)}</strong>
                    <small>
                      {incomplete && m.label.startsWith("Katkı")
                        ? "Kesin kâr değildir; eksik maliyet içerir"
                        : dateMode === "MOVEMENT"
                          ? "Seçili dönemin finans hareketleri"
                          : "Seçili sipariş kohortuna bağlı kayıtlar"}
                    </small>
                  </article>
                ))}
              </div>
              <div className="finance-strip">
                <span>
                  Komisyon <b>{displayMoney(summary.commission, currency)}</b>
                </span>
                <span>
                  Lojistik <b>{displayMoney(summary.logistics, currency)}</b>
                </span>
                <span>
                  Bilinen ürün maliyeti{" "}
                  <b>{displayMoney(summary.cost, currency)}</b>
                </span>
                <span>
                  Eksik maliyetli sipariş <b>{incomplete}</b>
                </span>
                <a
                  className="button"
                  href={`/api/export?format=pdf&currency=${currency}&from=${from}&to=${to}&mode=${dateMode}`}
                >
                  PDF raporu ↗
                </a>
              </div>
              <details className="finance-note">
                <summary>Hesaplama ve kur yöntemi</summary>
                <p>
                  Katkı = net satış − komisyon − lojistik − bilinen ürün
                  maliyeti. Tahsilat veya resmi muhasebe kârı değildir. İadede
                  komisyon/lojistik otomatik geri alınmaz. TRY ve RUB toplanmaz.
                  Tablodaki işlem kuru siparişe kayıtlı demo kurudur. Küçük ≈
                  karşılıkları TCMB son bülteninden güncel değerlemedir.
                  Excel/PDF özgün para birimindedir; karşılıklar satır bazında
                  yuvarlandığından toplamın dönüşümünden küçük farklar olabilir.
                </p>
              </details>
              <section className="panel comparison-panel">
                <h2>Önceki dönem karşılaştırması</h2>
                <p>
                  {from} / {to} ↔ {previousFrom} / {previousTo}
                </p>
                <div>
                  {(
                    [
                      ["Net satış", summary.net, previousSummary.net],
                      ["Brüt satış", summary.gross, previousSummary.gross],
                      ["İadeler", summary.refunds, previousSummary.refunds],
                    ] as const
                  ).map(([label, current, previous]) => (
                    <article key={label}>
                      <span>{label}</span>
                      <strong>{displayMoney(current, currency)}</strong>
                      <small>
                        Önceki: {displayMoney(previous, currency)} ·{" "}
                        {previous === 0
                          ? "Karşılaştırma tabanı yok"
                          : `${(((current - previous) / Math.abs(previous)) * 100).toFixed(1)}% değişim`}
                      </small>
                    </article>
                  ))}
                </div>
              </section>
              <div className="section-heading">
                <h2>Sipariş bazında mutabakat</h2>
                <span className="muted">Tutarlar {currency}</span>
              </div>
              <DataTable
                data={orders.filter((o) => ids.has(o.id))}
                columns={
                  [
                    { accessorKey: "number", header: "Sipariş" },
                    {
                      accessorKey: "status",
                      header: "Durum",
                      cell: ({ getValue }) => (
                        <Badge status={getValue<string>()} />
                      ),
                    },
                    {
                      id: "net",
                      header: "Net satış",
                      accessorFn: (o) => profitability(o, entries).net,
                      cell: ({ getValue }) =>
                        displayMoney(getValue<number>(), currency),
                    },
                    {
                      id: "cost",
                      header: "Ürün maliyeti",
                      cell: ({ row }) => {
                        const f = profitability(row.original, entries);
                        return f.complete ? (
                          displayMoney(f.cost, currency)
                        ) : (
                          <span className="danger-text">Eksik maliyet</span>
                        );
                      },
                    },
                    {
                      id: "contribution",
                      header: "Katkı kârı",
                      cell: ({ row }) => {
                        const f = profitability(row.original, entries);
                        return f.contribution === null
                          ? "Hesaplanamaz"
                          : displayMoney(f.contribution, currency);
                      },
                    },
                    {
                      id: "fx",
                      header: "Kur / tarih",
                      cell: ({ row }) => (
                        <div>
                          {row.original.fx_rate / 1000000} TRY/RUB
                          <small>
                            {String(row.original.fx_date).slice(0, 10)} · demo
                          </small>
                        </div>
                      ),
                    },
                  ] satisfies ColumnDef<Order>[]
                }
                onOpen={(o) => openOrder(o.id)}
                label="Finans mutabakatı"
              />
              <section className="panel">
                <h3>Seçili finans hareketleri</h3>
                <div className="reference-list">
                  {entries.map((e) => (
                    <div key={e.id}>
                      <button
                        className="text-link"
                        onClick={() => openOrder(e.order_id)}
                      >
                        {data.orders.find((o) => o.id === e.order_id)?.number ??
                          e.order_id}
                      </button>
                      <span>
                        {date(e.created_at)} · {e.kind} · {e.id}
                      </span>
                      <b>{displayMoney(e.amount, e.currency)}</b>
                    </div>
                  ))}
                </div>
              </section>
              <ProductAnalytics
                data={{ ...data, financial: entries }}
                orders={orders.filter((o) => ids.has(o.id))}
                currency={currency}
                days={Math.max(1, trend.length)}
                from={from}
                to={to}
              />
            </>
          )}
          {section === "settings" && (
            <SettingsView data={data} busy={busy} run={run} />
          )}
          <footer className="workspace-footer">
            <span>
              Marketplace OS <b>0.1</b> · Demo
            </span>
          </footer>
        </main>
      </div>
      <GuidedTour
        id="workspace-v1"
        steps={workspaceGuide}
        replay={guideReplay}
        ready={!order && !product && !creating}
      />
      {(order || product || creating) && (
        <div
          className="drawer-backdrop record-sheet-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setOrderId(null);
              setProductId(null);
              setCreating(false);
            }
          }}
        >
          <aside
            className="drawer record-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={
              creating ? "Yeni sipariş" : order ? order.number : product?.sku
            }
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const elements = e.currentTarget.querySelectorAll<HTMLElement>(
                  "button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href],textarea:not([disabled])",
                );
                const first = elements[0],
                  last = elements[elements.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">
                  {creating
                    ? "FBS / MANUEL DEMO SİPARİŞ"
                    : order
                      ? "SİPARİŞ ÇALIŞMA ALANI"
                      : "ÜRÜN & HAREKET DEFTERİ"}
                </p>
                <h2>
                  {creating ? "Yeni sipariş" : (order?.number ?? product?.sku)}
                </h2>
              </div>
              <button
                ref={closeRef}
                aria-label="Detayı kapat"
                onClick={() => {
                  setOrderId(null);
                  setProductId(null);
                  setCreating(false);
                }}
              >
                <X size={21} />
              </button>
            </div>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            {busy && (
              <p className="inline-pending" role="status">
                İşlem kaydediliyor…
              </p>
            )}
            {creating && (
              <form
                className="drawer-content form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  void run({
                    action: "CREATE_ORDER",
                    customer: String(form.get("customer")),
                    currency: String(form.get("currency")) as "RUB" | "TRY",
                    fxRate: Math.round(Number(form.get("fxRate")) * 1000000),
                    fxDate: String(form.get("fxDate")),
                    commissionBps: Math.round(
                      Number(form.get("commission")) * 100,
                    ),
                    logistics: Math.round(Number(form.get("logistics")) * 100),
                    lines: formLines,
                  })
                    .then((r) => {
                      if (r) {
                        setCreating(false);
                        setOrderId(r.reference);
                      }
                    })
                    .catch(() => {});
                }}
              >
                <label>
                  Alıcı (kurgusal)
                  <input
                    name="customer"
                    minLength={2}
                    maxLength={100}
                    required
                    placeholder="Demo alıcı adı"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Para birimi
                    <select name="currency">
                      <option>RUB</option>
                      <option>TRY</option>
                    </select>
                  </label>
                  <label>
                    Kur (1 RUB = TRY)
                    <input
                      name="fxRate"
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      defaultValue="0.485"
                      required
                    />
                  </label>
                  <label>
                    Kur tarihi
                    <input
                      name="fxDate"
                      type="date"
                      defaultValue={today()}
                      required
                    />
                  </label>
                  <label>
                    Komisyon (%)
                    <input
                      name="commission"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      defaultValue="15"
                      required
                    />
                  </label>
                  <label>
                    Lojistik (seçili para birimi)
                    <input
                      name="logistics"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue="250"
                      required
                    />
                  </label>
                </div>
                <h3>Sipariş satırları</h3>
                {formLines.map((l, index) => (
                  <div className="line-form" key={index}>
                    <select
                      aria-label={`Ürün ${index + 1}`}
                      value={l.productId}
                      onChange={(e) =>
                        setFormLines((prev) =>
                          prev.map((p, i) =>
                            i === index
                              ? { ...p, productId: e.target.value }
                              : p,
                          ),
                        )
                      }
                    >
                      {data.products
                        .filter((p) => p.active !== false)
                        .map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.sku} · {p.name} / {p.variant} ({p.available}{" "}
                            adet)
                          </option>
                        ))}
                    </select>
                    <input
                      aria-label={`Miktar ${index + 1}`}
                      type="number"
                      value={l.quantity}
                      min={1}
                      max={1000}
                      onChange={(e) =>
                        setFormLines((prev) =>
                          prev.map((p, i) =>
                            i === index
                              ? { ...p, quantity: Number(e.target.value) }
                              : p,
                          ),
                        )
                      }
                    />
                    {formLines.length > 1 && (
                      <button
                        type="button"
                        aria-label="Satırı kaldır"
                        onClick={() =>
                          setFormLines((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setFormLines((p) => [
                      ...p,
                      {
                        productId:
                          data.products.find(
                            (x) => !p.some((l) => l.productId === x.id),
                          )?.id ?? "p1",
                        quantity: 1,
                      },
                    ])
                  }
                >
                  <Plus size={16} />
                  Ürün ekle
                </button>
                <button className="primary" disabled={busy} type="submit">
                  Siparişi oluştur
                </button>
              </form>
            )}
            {order && (
              <div className="drawer-content">
                <div className="detail-summary">
                  <Badge status={order.status} />
                  <span className="model">{order.fulfillment}</span>
                  <strong>{displayMoney(order.total, order.currency)}</strong>
                </div>
                <div className="detail-grid">
                  <div>
                    <small>Alıcı</small>
                    <strong>{order.customer}</strong>
                  </div>
                  <div>
                    <small>Oluşturma</small>
                    <strong>{date(order.created_at)}</strong>
                  </div>
                  <div>
                    <small>Sevkiyat</small>
                    <strong>{order.tracking ?? "Henüz sevk edilmedi"}</strong>
                  </div>
                  <div>
                    <small>Belge</small>
                    <strong>
                      {order.invoice_status ?? "Taslak oluşturulmadı"}
                    </strong>
                  </div>
                </div>
                <Order360Overview order={order} data={data} />
                {order.fulfillment === "FBO" && (
                  <div className="info-box">
                    FBO referans kaydı. Yerel rezervasyon, hazırlama ve sevkiyat
                    kapalıdır. Gerçek Ozon FBO davranışı simüle edilmez.
                  </div>
                )}
                <h3 id="order360-products" tabIndex={-1}>
                  Sipariş ürünleri <span>{totalUnits} adet</span>
                </h3>
                <div className="order-lines">
                  {order.lines.map((l) => {
                    const p = data.products.find((p) => p.id === l.product_id)!;
                    return (
                      <div key={l.product_id}>
                        <span className="product-avatar">
                          <Boxes size={20} />
                        </span>
                        <div>
                          <strong>
                            {p.name} / {p.variant}
                          </strong>
                          <small>
                            {p.sku} · Barkod: <code>{p.barcode}</code>
                          </small>
                          <small>
                            Kullanılabilir: {p.available} · Birim:{" "}
                            {displayMoney(l.unit_price, order.currency)}
                          </small>
                        </div>
                        <b>
                          {l.packed}/{l.quantity}
                        </b>
                      </div>
                    );
                  })}
                </div>
                {order.fulfillment === "FBS" && (
                  <>
                    <div id="order360-operations" tabIndex={-1} className="flow-progress">
                      <span>Hazırlama doğrulaması</span>
                      <strong>
                        {progress} / {totalUnits}
                      </strong>
                      <progress value={progress} max={totalUnits} />
                    </div>
                    {["RESERVED", "PACKING"].includes(order.status) &&
                      allowed("SCAN") && (
                        <form
                          className="scan-box"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void run({
                              action: "SCAN",
                              orderId: order.id,
                              barcode: barcode.trim(),
                            })
                              .then(() => {
                                setBarcode("");
                                barcodeRef.current?.focus();
                              })
                              .catch(() => barcodeRef.current?.select());
                          }}
                        >
                          <label>
                            <ScanBarcode size={18} />
                            Barkod okutun (Enter ile doğrula)
                            <input
                              ref={barcodeRef}
                              aria-label="Ürün barkodu"
                              value={barcode}
                              onChange={(e) => setBarcode(e.target.value)}
                              placeholder="869…"
                              autoComplete="off"
                            />
                          </label>
                          <button
                            className="primary"
                            disabled={busy || !barcode}
                          >
                            Doğrula
                          </button>
                          <small>Her okutma 1 adet doğrular.</small>
                        </form>
                      )}
                    <div className="detail-actions">
                      {order.status === "NEW" && allowed("RESERVE") && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() =>
                            act({ action: "RESERVE", orderId: order.id })
                          }
                        >
                          Stok kontrol et & rezerve et
                        </button>
                      )}
                      {order.status === "READY" && allowed("SHIP") && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() =>
                            act({ action: "SHIP", orderId: order.id })
                          }
                        >
                          <Truck size={17} />
                          Sevk et
                        </button>
                      )}
                      {order.status === "SHIPPED" &&
                        allowed("INVOICE") &&
                        !order.invoice_id && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              act({ action: "INVOICE", orderId: order.id })
                            }
                          >
                            Fatura taslağı oluştur
                          </button>
                        )}
                      {order.invoice_id && allowed("INVOICE") && (
                        <a
                          className="button"
                          target="_blank"
                          href={`/invoice/${order.invoice_id}`}
                        >
                          DEMO / TASLAK PDF ↗
                        </a>
                      )}
                    </div>
                    {((["NEW", "RESERVED", "PACKING", "READY"].includes(
                      order.status,
                    ) &&
                      allowed("CANCEL")) ||
                      (order.status === "SHIPPED" && allowed("RETURN")) ||
                      (order.status === "RETURN_PENDING" && allowed("QC"))) && (
                      <section className="reason-box">
                        <label>
                          İşlem gerekçesi
                          <input
                            aria-label="İşlem gerekçesi"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            minLength={3}
                            placeholder="En az 3 karakter"
                          />
                        </label>
                        <div>
                          {["NEW", "RESERVED", "PACKING", "READY"].includes(
                            order.status,
                          ) &&
                            allowed("CANCEL") && (
                              <button
                                className="danger"
                                disabled={busy || reason.trim().length < 3}
                                onClick={() =>
                                  act({
                                    action: "CANCEL",
                                    orderId: order.id,
                                    reason,
                                  })
                                }
                              >
                                Siparişi iptal et
                              </button>
                            )}
                          {order.status === "SHIPPED" && allowed("RETURN") && (
                            <button
                              disabled={busy || reason.trim().length < 3}
                              onClick={() =>
                                act({
                                  action: "RETURN",
                                  orderId: order.id,
                                  reason,
                                })
                              }
                            >
                              İade al → Karantina
                            </button>
                          )}
                          {order.status === "RETURN_PENDING" &&
                            allowed("QC") && (
                              <>
                                <button
                                  disabled={busy || reason.trim().length < 3}
                                  onClick={() =>
                                    act({
                                      action: "QC",
                                      orderId: order.id,
                                      accept: true,
                                      reason,
                                    })
                                  }
                                >
                                  QC onayla → Satılabilir stok
                                </button>
                                <button
                                  className="danger"
                                  disabled={busy || reason.trim().length < 3}
                                  onClick={() =>
                                    act({
                                      action: "QC",
                                      orderId: order.id,
                                      accept: false,
                                      reason,
                                    })
                                  }
                                >
                                  QC reddet → Hurda
                                </button>
                              </>
                            )}
                        </div>
                      </section>
                    )}
                    {order.invoice_id && allowed("INVOICE_STATUS") && (
                      <section className="reason-box">
                        <label>
                          Belge işlem açıklaması
                          <input
                            aria-label="Belge işlem açıklaması"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                        </label>
                        <div>
                          {(["ERROR", "CANCELLED", "DRAFT"] as const).map(
                            (status) => (
                              <button
                                key={status}
                                disabled={
                                  busy ||
                                  reason.trim().length < 3 ||
                                  order.invoice_status === status
                                }
                                onClick={() =>
                                  act({
                                    action: "INVOICE_STATUS",
                                    orderId: order.id,
                                    status,
                                    reason,
                                  })
                                }
                              >
                                {status === "ERROR"
                                  ? "Demo hata işaretle"
                                  : status === "CANCELLED"
                                    ? "Taslağı iptal et"
                                    : "Taslağı yeniden aç"}
                              </button>
                            ),
                          )}
                        </div>
                      </section>
                    )}
                  </>
                )}
                {data.actor.role !== "WAREHOUSE" && financialOrder && (
                  <>
                    <h3 id="order360-finance" tabIndex={-1}>
                      Finansal sonuç <span>{order.currency}</span>
                    </h3>
                    <div className="finance-detail">
                      {[
                        ["Brüt", financialOrder.gross],
                        ["İade", financialOrder.refunds],
                        ["Net", financialOrder.net],
                        ["Komisyon", financialOrder.commission],
                        ["Lojistik", financialOrder.logistics],
                        [
                          "Ürün maliyeti",
                          financialOrder.complete ? financialOrder.cost : null,
                        ],
                        ["Katkı kârı", financialOrder.contribution],
                      ].map(([label, value]) => (
                        <div key={String(label)}>
                          <span>{label}</span>
                          <strong>
                            {value === null
                              ? "Eksik maliyet"
                              : displayMoney(Number(value), order.currency)}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <p className="muted">
                      Kur: {order.fx_rate / 1000000} TRY/RUB ·{" "}
                      {String(order.fx_date).slice(0, 10)} (demo). Tutarlar
                      sevkiyatla finans defterine işlenir.
                    </p>
                  </>
                )}
                {allowed("CORRECT_MISSING_COST") && (
                  <CostCorrections
                    key={order.id}
                    order={order}
                    products={data.products}
                    busy={busy}
                    run={run}
                  />
                )}
                <h3>Demo sağlayıcı kayıtları</h3>
                {(data.integrationEvents ?? [])
                  .filter((e) => e.order_id === order.id)
                  .map((e) => (
                    <p key={e.id}>
                      {date(e.created_at)} · {e.provider} · {e.operation} ·
                      Dışarı gönderilmedi
                    </p>
                  ))}
                <h3 id="order360-trace" tabIndex={-1}>Bağlı kayıtlar ve işlem geçmişi</h3>
                <Order360Trace order={order} data={data} />
              </div>
            )}
            {product && (
              <div className="drawer-content">
                <h2>
                  {product.name} / {product.variant}
                </h2>
                <p className="muted">
                  {product.category} · {product.barcode}
                </p>
                <div className="stock-detail">
                  {[
                    ["Fiziksel", product.physical],
                    ["Rezerve", product.reserved],
                    ["Kullanılabilir", product.available],
                    ["Karantina", product.quarantine],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <span>{l}</span>
                      <strong>{v}</strong>
                    </div>
                  ))}
                </div>
                {allowed("ADJUST") && (
                  <form
                    className="form reason-box"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      act({
                        action: "ADJUST",
                        productId: product.id,
                        quantity: Number(f.get("quantity")),
                        reason: String(f.get("reason")),
                      });
                    }}
                  >
                    <h3>Sayım farkı / Stok düzeltme</h3>
                    <label>
                      Fark (+ giriş, − çıkış)
                      <input
                        name="quantity"
                        type="number"
                        step={1}
                        required
                        placeholder="Örnek: -2"
                      />
                    </label>
                    <label>
                      Sayım referansı / Gerekçe
                      <input
                        name="reason"
                        minLength={3}
                        required
                        placeholder="SAYIM-2026-10 / raf farkı"
                      />
                    </label>
                    <button disabled={busy}>Referanslı hareket kaydet</button>
                  </form>
                )}
                <ProductSource product={product} />
                {allowed("UPDATE_CATALOG") && (
                  <ProductEditor
                    key={`${product.id}:${product.catalog_version}`}
                    product={product}
                    locked={data.orders.some((o) =>
                      o.lines.some((l) => l.product_id === product.id),
                    )}
                    busy={busy}
                    run={run}
                  />
                )}
                <h3>Stok hareket defteri</h3>
                <DataTable
                  data={data.ledger.filter((l) => l.product_id === product.id)}
                  columns={
                    [
                      {
                        accessorKey: "created_at",
                        header: "Tarih",
                        cell: ({ getValue }) => date(getValue<string>()),
                      },
                      { accessorKey: "kind", header: "Tür" },
                      { accessorKey: "warehouse_id", header: "Depo" },
                      { accessorKey: "quantity", header: "Miktar" },
                      {
                        accessorKey: "reference",
                        header: "Referans",
                        cell: ({ row }) =>
                          data.orders.some(
                            (o) => o.id === row.original.reference,
                          ) ? (
                            <button
                              className="text-link"
                              onClick={() => {
                                setProductId(null);
                                setOrderId(row.original.reference);
                              }}
                            >
                              {
                                data.orders.find(
                                  (o) => o.id === row.original.reference,
                                )?.number
                              }
                            </button>
                          ) : (
                            row.original.reference.slice(0, 12)
                          ),
                      },
                      { accessorKey: "reason", header: "Gerekçe" },
                    ] satisfies ColumnDef<Ledger>[]
                  }
                  label="Ürün hareketleri"
                />
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
function ProductAnalytics({
  data,
  orders,
  currency,
  days,
  from,
  to,
}: {
  data: WorkspaceSnapshot;
  orders: Order[];
  currency: string;
  days: number;
  from: string;
  to: string;
}) {
  const list = data.products
    .map((p) => {
      const linked = orders.flatMap((o) =>
        o.lines.filter((l) => l.product_id === p.id).map((l) => ({ o, l })),
      );
      const fulfilled = linked.filter((x) =>
        ["SHIPPED", "RETURN_PENDING", "RETURNED"].includes(x.o.status),
      );
      const units = fulfilled.reduce(
        (s, { o, l }) =>
          s +
          l.quantity *
            ((data.financial.some(
              (e) => e.order_id === o.id && e.kind === "SALE",
            )
              ? 1
              : 0) -
              (data.financial.some(
                (e) => e.order_id === o.id && e.kind === "REFUND",
              )
                ? 1
                : 0)),
        0,
      );
      const values = fulfilled.reduce(
        (acc, { o }) => {
          const row = lineContributions(o, data.financial).find(
            (r) => r.productId === p.id,
          )!;
          acc.sales += row.net;
          acc.contribution += row.contribution ?? 0;
          acc.complete &&= row.contribution !== null;
          return acc;
        },
        { sales: 0, contribution: 0, complete: true },
      );
      const moves = data.ledger.filter(
        (l) => l.product_id === p.id && l.warehouse_id === "MAIN",
      );
      const opening = moves
          .filter((l) => l.created_at.slice(0, 10) < from)
          .reduce((s, l) => s + l.quantity, 0),
        closing = moves
          .filter((l) => l.created_at.slice(0, 10) <= to)
          .reduce((s, l) => s + l.quantity, 0);
      const out = moves
        .filter(
          (l) =>
            l.kind === "SHIPMENT" &&
            l.created_at.slice(0, 10) >= from &&
            l.created_at.slice(0, 10) <= to,
        )
        .reduce((s, l) => s - l.quantity, 0);
      const average = (opening + closing) / 2;
      return {
        ...p,
        units,
        sales: Math.round(values.sales),
        speed: units / days,
        turnover: average > 0 ? out / average : null,
        contribution: values.complete ? Math.round(values.contribution) : null,
      };
    })
    .filter((p) => p.sales !== 0 || p.contribution !== 0)
    .sort((a, b) => b.units - a.units);
  return (
    <>
      <div className="section-heading">
        <h2>Ürün performansı</h2>
        <small>
          Giderler tutara oranla tahsis edilir; ürün maliyeti satırdan alınır.
          Devir = dönem sevk adedi / (açılış + kapanış stoğu) × 2.
        </small>
      </div>
      <DataTable
        data={list}
        columns={[
          { accessorKey: "sku", header: "SKU" },
          { accessorKey: "name", header: "Ürün" },
          { accessorKey: "units", header: "Net adet" },
          {
            accessorKey: "sales",
            header: "Net satış",
            cell: ({ getValue }) => displayMoney(getValue<number>(), currency),
          },
          {
            accessorKey: "speed",
            header: "Adet / gün",
            cell: ({ getValue }) => getValue<number>().toFixed(2),
          },
          {
            accessorKey: "turnover",
            header: "Stok devir",
            cell: ({ getValue }) =>
              getValue<number | null>()?.toFixed(2) ?? "—",
          },
          {
            accessorKey: "contribution",
            header: "Tahsisli katkı",
            cell: ({ getValue }) =>
              getValue<number | null>() === null
                ? "Eksik maliyet"
                : displayMoney(getValue<number>(), currency),
          },
        ]}
        label="Ürün performansı"
      />
    </>
  );
}
function SettingsView({
  data,
  busy,
  run,
}: {
  data: WorkspaceSnapshot;
  busy: boolean;
  run: (c: Command) => Promise<unknown>;
}) {
  const [reset, setReset] = useState("");
  return (
    <>
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>Mağaza ayarları</h2>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run({
                action: "SETTINGS",
                name: String(f.get("name")),
                autoDraft: f.get("autoDraft") === "on",
              }).catch(() => {});
            }}
          >
            <label>
              İşletme adı
              <input
                name="name"
                defaultValue={data.workspace.name}
                minLength={2}
                maxLength={80}
                required
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="autoDraft"
                defaultChecked={data.workspace.settings.autoDraft}
              />
              Sevkiyatta otomatik DEMO fatura taslağı oluştur
            </label>
            <button className="primary" disabled={busy}>
              Ayarları kaydet
            </button>
          </form>
          <hr />
          <h3>Entegrasyonlar</h3>
          <div className="integration-row">
            <strong>Ozon Adapter</strong>
            <span className="pill">DEMO</span>
          </div>
          <div className="integration-row">
            <strong>Paraşüt Adapter</strong>
            <span className="pill">DEMO</span>
          </div>
          <details className="workspace-disclosure">
            <summary>Bağlantı durumu</summary>
            <p>
              Ozon/Paraşüt canlı API bağlantıları yoktur; dış sisteme veri
              gönderilmez.
            </p>
          </details>
        </section>
        <section className="panel settings-panel">
          <h2>Demo alanını sıfırla</h2>
          <p>
            Yalnızca bu çalışma alanı başlangıç verilerine döner. Diğer
            oturumlar etkilenmez.
          </p>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void run({ action: "RESET", confirmation: "SIFIRLA" })
                .then(() => setReset(""))
                .catch(() => {});
            }}
          >
            <label>
              Onay için SIFIRLA yazın
              <input
                value={reset}
                onChange={(e) => setReset(e.target.value)}
                aria-label="Demo sıfırlama onayı"
              />
            </label>
            <button className="danger" disabled={busy || reset !== "SIFIRLA"}>
              Bu demo alanını sıfırla
            </button>
          </form>
          <p className="muted">
            Nesil: {data.workspace.generation} · Eski açık sekmelerin işlemleri
            engellenir.
          </p>
        </section>
      </div>
      <div className="section-heading">
        <h2>Kullanıcı yönetimi</h2>
        <span className="muted">Yetkiler sunucuda doğrulanır</span>
      </div>
      <DataTable
        data={data.users}
        columns={
          [
            { accessorKey: "name", header: "Kullanıcı" },
            {
              accessorKey: "role",
              header: "Rol",
              cell: ({ row }) => roleLabels[row.original.role],
            },
            {
              accessorKey: "active",
              header: "Erişim",
              cell: ({ row }) => (
                <button
                  disabled={busy || row.original.id === data.actor.userId}
                  onClick={() =>
                    void run({
                      action: "USER",
                      userId: row.original.id,
                      name: row.original.name,
                      role: row.original.role,
                      active: !row.original.active,
                    }).catch(() => {})
                  }
                >
                  {row.original.active
                    ? "Aktif → Pasifleştir"
                    : "Pasif → Aktifleştir"}
                </button>
              ),
            },
          ] satisfies ColumnDef<User>[]
        }
        label="Kullanıcılar"
      />
      <section className="panel settings-panel">
        <h3>Kullanıcı ekle / Güncelle</h3>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void run({
              action: "USER",
              userId: String(f.get("id")),
              name: String(f.get("name")),
              role: String(f.get("role")) as Role,
              active: true,
            }).catch(() => {});
          }}
        >
          <label>
            Kullanıcı ID
            <input name="id" required minLength={2} />
          </label>
          <label>
            Ad soyad
            <input name="name" required minLength={2} />
          </label>
          <label>
            Rol
            <select name="role">
              {Object.entries(roleLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <button disabled={busy}>Kaydet</button>
        </form>
        <details className="workspace-disclosure">
          <summary>Demo hesapları</summary>
          <p>
            Üç yerleşik demo rolü vardır. Gerçek kullanıcı doğrulaması henüz
            yok.
          </p>
        </details>
      </section>
      <div className="section-heading">
        <h2>Denetim kayıtları</h2>
      </div>
      <DataTable
        data={data.audit}
        columns={[
          {
            accessorKey: "created_at",
            header: "Zaman",
            cell: ({ getValue }) => date(getValue<string>()),
          },
          { accessorKey: "action", header: "İşlem" },
          { accessorKey: "actor", header: "Kullanıcı" },
          { accessorKey: "reference", header: "Kaynak" },
          {
            id: "details",
            header: "Açıklama",
            cell: ({ row }) => JSON.stringify(row.original.details),
          },
        ]}
        label="Denetim kayıtları"
      />
    </>
  );
}

export function Workspace(props: { initialSection?: Section }) {
  return (
    <CurrencyDisplayProvider>
      <WorkspaceBody {...props} />
    </CurrencyDisplayProvider>
  );
}
