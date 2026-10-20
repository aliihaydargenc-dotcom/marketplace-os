"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  CheckCheck,
  Filter,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import type { Order, WorkspaceSnapshot } from "@/domain/types";
import { statusLabels } from "@/domain/types";
import { permissions } from "@/domain/permissions";
import {
  bulkEligibility,
  defaultOrderView,
  filterOrders,
  orderViewConfigSchema,
  orderLayoutSchema,
  sameViewConfig,
  type OrderFilters,
  type OrderViewConfig,
  type OrderViewMutation,
  type OrderViewPreferences,
} from "@/domain/orders/views";
import { DataTable } from "./data-table";
import "./orders-view.css";

class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new RequestError(
      result.error ?? "İşlem tamamlanamadı",
      response.status,
    );
  return result;
}
type Response = { generation: number; preferences: OrderViewPreferences };
type Outcome = {
  number: string;
  status: "success" | "skipped" | "error";
  message: string;
};
type Props = {
  data: WorkspaceSnapshot;
  columns: ColumnDef<Order>[];
  onOpen: (order: Order) => void;
  initialStatus?: string;
  busy: boolean;
  onBulkBusy: (busy: boolean) => void;
  onRefresh: () => Promise<void>;
};

export function OrdersView({
  data,
  columns,
  onOpen,
  initialStatus,
  busy,
  onBulkBusy,
  onRefresh,
}: Props) {
  const [prefs, setPrefs] = useState<OrderViewPreferences | null>(null);
  const [config, setConfig] = useState<OrderViewConfig>(defaultOrderView);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tableEpoch, setTableEpoch] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(
    null,
  );
  const writing = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const generation = data.workspace.generation;
  const locked = busy || saving || loading || batch !== null;

  useEffect(() => {
    let active = true;
    request<Response>("/api/order-views")
      .then((result) => {
        if (!active) return;
        if (result.generation !== generation)
          throw new Error("Demo yenilenmiş. Sayfayı yenileyin.");
        setPrefs(result.preferences);
        const saved = result.preferences.views.find(
          (v) => v.id === result.preferences.activeId,
        );
        let next = saved?.config ?? defaultOrderView();
        if (initialStatus && Object.hasOwn(statusLabels, initialStatus)) {
          next = {
            ...defaultOrderView(),
            filters: {
              ...defaultOrderView().filters,
              status: initialStatus as OrderFilters["status"],
              fulfillment: "FBS",
            },
          };
          setActiveId(null);
        } else setActiveId(saved?.id ?? null);
        setConfig(next);
        setSelection({});
        setTableEpoch((n) => n + 1);
        setError("");
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [generation, initialStatus, retry]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);

  const filters = config.filters;
  const filtered = useMemo(
    () => filterOrders(data.orders, data.products, filters),
    [data.orders, data.products, filters],
  );
  const scoped = useMemo(
    () =>
      filterOrders(data.orders, data.products, { ...filters, status: "ALL" }),
    [data.orders, data.products, filters],
  );
  const selected = filtered.filter((order) => selection[order.id]);
  const reservedCandidates = selected.filter(
    (order) => !bulkEligibility(order, "RESERVE"),
  );
  const shipmentCandidates = selected.filter(
    (order) => !bulkEligibility(order, "SHIP"),
  );
  const selectedView = prefs?.views.find((v) => v.id === activeId);
  const modified = selectedView
    ? !sameViewConfig(config, selectedView.config)
    : !sameViewConfig(config, defaultOrderView());
  const dateError = !!filters.from && !!filters.to && filters.from > filters.to;
  const canReserve = (permissions.RESERVE as readonly string[]).includes(
    data.actor.role,
  );
  const canShip = (permissions.SHIP as readonly string[]).includes(
    data.actor.role,
  );
  const tableColumns = useMemo(
    () =>
      columns.map((c) =>
        "accessorKey" in c && c.accessorKey === "number"
          ? { ...c, enableHiding: false }
          : c,
      ),
    [columns],
  );

  const updateFilters = useCallback((patch: Partial<OrderFilters>) => {
    setConfig((current) => ({
      ...current,
      filters: { ...current.filters, ...patch },
    }));
    setSelection({});
    setNotice("");
  }, []);

  async function write(operation: OrderViewMutation["operation"]) {
    if (!prefs || writing.current || locked) return null;
    writing.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await request<Response>("/api/order-views", {
        method: "PUT",
        body: JSON.stringify({
          generation,
          revision: prefs.revision,
          operation,
        }),
      });
      setPrefs(result.preferences);
      setActiveId(result.preferences.activeId);
      return result.preferences;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Görünüm kaydedilemedi");
      return null;
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }

  async function activate(id: string | null) {
    const next = await write({ action: "ACTIVATE", id });
    if (!next) return;
    const view = next.views.find((v) => v.id === next.activeId);
    setConfig(view?.config ?? defaultOrderView());
    setSelection({});
    setSaveOpen(false);
    setConfirmDelete(false);
    setTableEpoch((n) => n + 1);
    setNotice(
      view ? `${view.name} açıldı.` : "Tüm siparişler görünümü açıldı.",
    );
  }
  async function save(asNew: boolean) {
    const parsed = orderViewConfigSchema.safeParse(config);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (name.trim().length < 2 || name.trim().length > 50) {
      setError("Görünüm adı 2–50 karakter olmalı");
      return;
    }
    const next = await write({
      action: "SAVE",
      view: {
        id: !asNew && activeId ? activeId : crypto.randomUUID(),
        name: name.trim(),
        config: parsed.data,
      },
    });
    if (!next) return;
    setConfig(parsed.data);
    setSaveOpen(false);
    setConfirmDelete(false);
    setNotice("Görünüm sunucuda kaydedildi. Yeniden açılışta geri yüklenecek.");
  }
  async function remove() {
    if (!activeId) return;
    const next = await write({ action: "DELETE", id: activeId });
    if (!next) return;
    setConfig(defaultOrderView());
    setSelection({});
    setConfirmDelete(false);
    setSaveOpen(false);
    setTableEpoch((n) => n + 1);
    setNotice("Görünüm silindi. Sipariş kayıtları etkilenmedi.");
  }

  async function bulk(action: "RESERVE" | "SHIP") {
    if (writing.current || locked || dateError) return;
    const candidates =
      action === "RESERVE" ? reservedCandidates : shipmentCandidates;
    if (!candidates.length || (action === "RESERVE" ? !canReserve : !canShip))
      return;
    writing.current = true;
    onBulkBusy(true);
    setBatch({ done: 0, total: candidates.length });
    setError("");
    setNotice("");
    const result: Outcome[] = selected
      .filter((o) => bulkEligibility(o, action))
      .map((o) => ({
        number: o.number,
        status: "skipped",
        message: bulkEligibility(o, action)!,
      }));
    setOutcomes([]);
    try {
      for (let i = 0; i < candidates.length; i++) {
        const order = candidates[i];
        try {
          await request("/api/command", {
            method: "POST",
            body: JSON.stringify({
              key: crypto.randomUUID(),
              generation,
              command: { action, orderId: order.id },
            }),
          });
          result.push({
            number: order.number,
            status: "success",
            message:
              action === "RESERVE"
                ? "Stok rezerve edildi"
                : "Sevkiyat kaydedildi",
          });
        } catch (e) {
          result.push({
            number: order.number,
            status: "error",
            message:
              e instanceof RequestError
                ? e.message
                : "Bağlantı sonucu belirsiz. Yenileyip kaydı kontrol edin.",
          });
        }
        setBatch({ done: i + 1, total: candidates.length });
      }
      await onRefresh();
      setOutcomes(result);
      setSelection({});
      setNotice(
        `${result.filter((r) => r.status === "success").length} başarılı · ${result.filter((r) => r.status === "skipped").length} uygun olmadığı için atlandı · ${result.filter((r) => r.status === "error").length} hata / kontrol gerekiyor`,
      );
    } finally {
      writing.current = false;
      setBatch(null);
      onBulkBusy(false);
    }
  }

  if (!prefs)
    return (
      <section className="orders-view">
        <div className="info-box" role={error ? "alert" : "status"}>
          {error || "Kişisel görünümler yükleniyor…"}
          {error && (
            <button
              onClick={() => {
                setLoading(true);
                setRetry((n) => n + 1);
              }}
            >
              Yeniden dene
            </button>
          )}
        </div>
      </section>
    );

  return (
    <section className="orders-view" aria-label="Sipariş çalışma listesi">
      <div className="order-view-toolbar">
        <label>
          <Bookmark size={17} />
          <span>Görünümlerim</span>
          <select
            aria-label="Kayıtlı sipariş görünümü"
            value={activeId ?? ""}
            disabled={locked}
            onChange={(e) => void activate(e.target.value || null)}
          >
            <option value="">Tüm siparişler</option>
            {prefs.views.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </select>
        </label>
        <span className="order-view-state">
          {saving
            ? "Kaydediliyor…"
            : modified
              ? "Kaydedilmemiş değişiklikler"
              : selectedView
                ? "Sunucuda kayıtlı"
                : "Varsayılan görünüm"}
        </span>
        <button
          type="button"
          disabled={locked}
          onClick={() => {
            setName(selectedView?.name ?? "");
            setSaveOpen((v) => !v);
            setConfirmDelete(false);
          }}
        >
          <Save size={15} />
          Görünümü kaydet
        </button>
        {activeId && (
          <button
            type="button"
            className="icon-button"
            aria-label="Kayıtlı görünümü sil"
            disabled={locked}
            onClick={() => {
              setConfirmDelete(true);
              setSaveOpen(false);
            }}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
      {saveOpen && (
        <form
          className="order-view-editor"
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
        >
          <label>
            Görünüm adı
            <input
              autoFocus
              aria-label="Görünüm adı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Örn. Sevke hazır FBS"
              disabled={locked}
            />
          </label>
          <button
            className="primary"
            disabled={locked || name.trim().length < 2}
          >
            {activeId ? "Görünümü güncelle" : "Yeni görünüm kaydet"}
          </button>
          {activeId && (
            <button
              type="button"
              disabled={locked || prefs.views.length >= 12}
              onClick={() => void save(true)}
            >
              Yeni olarak kaydet
            </button>
          )}
          <button
            type="button"
            disabled={locked}
            onClick={() => setSaveOpen(false)}
          >
            Vazgeç
          </button>
          <small>
            Filtre, sıralama, sütunlar ve sayfa boyutu kaydedilir. Tarih
            aralıkları sabittir. {prefs.views.length}/12 görünüm.
          </small>
        </form>
      )}
      {confirmDelete && (
        <div className="order-delete-confirm" role="alert">
          <span>
            “{selectedView?.name}” görünümü silinsin mi? Siparişler silinmez.
          </span>
          <button
            type="button"
            className="danger"
            disabled={locked}
            onClick={() => void remove()}
          >
            Görünümü sil
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => setConfirmDelete(false)}
          >
            Vazgeç
          </button>
        </div>
      )}
      {error && (
        <div className="alert error" role="alert">
          <span>{error}</span>
          <button
            disabled={locked}
            onClick={() => {
              setLoading(true);
              setRetry((n) => n + 1);
            }}
          >
            Görünümleri yeniden yükle
          </button>
        </div>
      )}
      {notice && (
        <div className="order-view-notice" role="status">
          <CheckCheck size={16} />
          {notice}
        </div>
      )}
      <div className="tabs order-status-tabs">
        {[
          ["ALL", "Tümü"],
          ["NEW", "Yeni"],
          ["RESERVED", "Rezerve"],
          ["PACKING", "Hazırlanıyor"],
          ["READY", "Sevke hazır"],
          ["SHIPPED", "Sevk edildi"],
          ["RETURN_PENDING", "İade kontrolü"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            disabled={locked}
            aria-pressed={filters.status === id}
            className={filters.status === id ? "active" : ""}
            onClick={() =>
              updateFilters({ status: id as OrderFilters["status"] })
            }
          >
            {label}
            <span>
              {id === "ALL"
                ? scoped.length
                : scoped.filter((o) => o.status === id).length}
            </span>
          </button>
        ))}
      </div>
      <div className="order-query-panel">
        <div className="filterbar">
          <div className="search-field">
            <Search size={17} />
            <input
              ref={searchRef}
              aria-label="Sipariş ara"
              value={filters.query}
              maxLength={200}
              placeholder="Sipariş, alıcı, SKU veya barkod…"
              disabled={locked}
              onChange={(e) => updateFilters({ query: e.target.value })}
            />
            <kbd>Ctrl K</kbd>
          </div>
          <select
            aria-label="Sipariş durumu"
            value={filters.status}
            disabled={locked}
            onChange={(e) =>
              updateFilters({
                status: e.target.value as OrderFilters["status"],
              })
            }
          >
            <option value="ALL">Tüm durumlar</option>
            {Object.entries(statusLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Lojistik modeli"
            value={filters.fulfillment}
            disabled={locked}
            onChange={(e) =>
              updateFilters({
                fulfillment: e.target.value as OrderFilters["fulfillment"],
              })
            }
          >
            <option value="ALL">FBS + FBO</option>
            <option value="FBS">FBS</option>
            <option value="FBO">FBO · Referans</option>
          </select>
        </div>
        <div className="order-datebar">
          <Filter size={14} />
          <span>Oluşturma tarihi</span>
          <label>
            Başlangıç
            <input
              type="date"
              aria-label="Sipariş başlangıç tarihi"
              value={filters.from}
              disabled={locked}
              onChange={(e) => updateFilters({ from: e.target.value })}
            />
          </label>
          <span>—</span>
          <label>
            Bitiş
            <input
              type="date"
              aria-label="Sipariş bitiş tarihi"
              value={filters.to}
              disabled={locked}
              onChange={(e) => updateFilters({ to: e.target.value })}
            />
          </label>
          <button
            type="button"
            disabled={locked}
            onClick={() => {
              const to = new Date().toLocaleDateString("sv-SE", {
                timeZone: "Europe/Istanbul",
              });
              const from = new Date(`${to}T12:00:00Z`);
              from.setUTCDate(from.getUTCDate() - 29);
              updateFilters({ from: from.toISOString().slice(0, 10), to });
            }}
          >
            Son 30 gün
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => updateFilters({ from: "", to: "" })}
          >
            Tüm tarihler
          </button>
          <small>
            Türkiye saati · {filtered.length} / {data.orders.length} kayıt
          </small>
        </div>
        {dateError && (
          <p className="error" role="alert">
            Başlangıç tarihi bitişten sonra olamaz.
          </p>
        )}
      </div>
      {(filters.query ||
        filters.status !== "ALL" ||
        filters.fulfillment !== "ALL" ||
        filters.from ||
        filters.to) && (
        <div className="order-filter-summary">
          <span>Etkin filtreler</span>
          {filters.status !== "ALL" && (
            <span>{statusLabels[filters.status]}</span>
          )}
          {filters.fulfillment !== "ALL" && <span>{filters.fulfillment}</span>}
          {filters.query && <span>Arama: {filters.query}</span>}
          {(filters.from || filters.to) && (
            <span>
              {filters.from || "Başlangıç yok"} → {filters.to || "Bitiş yok"}
            </span>
          )}
          <button
            type="button"
            disabled={locked}
            onClick={() => updateFilters(defaultOrderView().filters)}
          >
            <X size={12} />
            Filtreleri temizle
          </button>
        </div>
      )}
      {selected.length > 0 && (
        <div className="order-bulkbar">
          <div>
            <strong>{selected.length} sipariş seçildi</strong>
            <small>Seçim filtrelenen listenin tüm sayfalarında korunur.</small>
          </div>
          <div className="order-bulk-actions">
            {canReserve && (
              <button
                type="button"
                disabled={locked || dateError || !reservedCandidates.length}
                onClick={() => void bulk("RESERVE")}
              >
                Stok rezerve et <b>{reservedCandidates.length}</b>
              </button>
            )}
            {canShip && (
              <button
                type="button"
                disabled={locked || dateError || !shipmentCandidates.length}
                onClick={() => void bulk("SHIP")}
              >
                Sevke hazırları gönder <b>{shipmentCandidates.length}</b>
              </button>
            )}
            <button
              type="button"
              disabled={locked}
              onClick={() => setSelection({})}
            >
              Seçimi temizle
            </button>
          </div>
          <p>
            Yalnız durumu uygun FBS kayıtları işlenir. Stok ve yetkiler sunucuda
            yeniden kontrol edilir.
          </p>
        </div>
      )}
      {batch && (
        <div className="order-batch-progress" role="status">
          İşleniyor: {batch.done} / {batch.total}
          <progress max={batch.total} value={batch.done} />
        </div>
      )}
      {outcomes.length > 0 && (
        <details className="order-bulk-results" open>
          <summary>Son toplu işlem · {outcomes.length} kayıt</summary>
          <ul>
            {outcomes.map((outcome) => (
              <li key={outcome.number} data-outcome={outcome.status}>
                <strong>{outcome.number}</strong>
                <span>
                  {outcome.status === "success"
                    ? "Başarılı"
                    : outcome.status === "skipped"
                      ? "Atlandı"
                      : "Kontrol gerekli"}
                </span>
                <span>{outcome.message}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setOutcomes([])}>
            Sonuçları kapat
          </button>
        </details>
      )}
      <DataTable
        key={tableEpoch}
        data={filtered}
        columns={tableColumns}
        onOpen={onOpen}
        selection={selection}
        onSelection={setSelection}
        layout={config.layout}
        onLayoutChange={(layout) => {
          const parsed = orderLayoutSchema.safeParse(layout);
          if (parsed.success) setConfig((v) => ({ ...v, layout: parsed.data }));
          else setError("Tablo görünümü geçersiz. Görünümü yeniden açın.");
        }}
        disabled={locked}
        label="Siparişler"
      />
      <p className="order-view-scope">
        <Bookmark size={13} />
        Kişisel görünümler bu demo alanındaki{" "}
        {data.actor.role === "ADMIN"
          ? "yönetici"
          : data.actor.role === "WAREHOUSE"
            ? "depo"
            : "muhasebe"}{" "}
        kullanıcısına aittir.
      </p>
    </section>
  );
}
