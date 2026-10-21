"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  FileWarning,
  Search,
  ScanBarcode,
  ShieldAlert,
  SlidersHorizontal,
  ClipboardList,
  ArrowUpRight,
} from "lucide-react";
import type { WorkspaceSnapshot } from "@/domain/types";
import {
  operationalTasks,
  type OperationalTask,
  type TaskLane,
} from "@/domain/operations/action-center";
import "./action-center.css";

type Filter = "ALL" | TaskLane;
const filters: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Tüm işler" },
  { id: "ISSUE", label: "Engeller" },
  { id: "FULFILL", label: "Hazırlama & sevk" },
  { id: "DOCUMENT", label: "Belgeler & maliyet" },
  { id: "STOCK", label: "Stok uyarıları" },
];
const laneLabels: Record<TaskLane, string> = {
  ISSUE: "Müdahale",
  FULFILL: "Operasyon",
  DOCUMENT: "Belge / finans",
  STOCK: "Envanter",
};
const laneIcons = {
  ISSUE: AlertCircle,
  FULFILL: ScanBarcode,
  DOCUMENT: FileWarning,
  STOCK: Boxes,
};

export function ActionCenter({
  data,
  busy,
  onAction,
  onOpenOrder,
}: {
  data: WorkspaceSnapshot;
  busy: boolean;
  onAction: (task: OperationalTask) => void;
  onOpenOrder: (id: string) => void;
}) {
  const tasks = useMemo(() => operationalTasks(data), [data]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);
  const counts = useMemo(() => {
    const values = {
      ALL: tasks.length,
      ISSUE: 0,
      FULFILL: 0,
      DOCUMENT: 0,
      STOCK: 0,
    };
    for (const task of tasks) values[task.lane] += 1;
    return values;
  }, [tasks]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("tr-TR");
    return tasks.filter((task) => {
      if (filter !== "ALL" && task.lane !== filter) return false;
      if (!term) return true;
      const order = task.orderId
        ? data.orders.find((o) => o.id === task.orderId)
        : null;
      const product = task.productId
        ? data.products.find((p) => p.id === task.productId)
        : null;
      return [
        task.reference,
        task.title,
        task.reason,
        order?.customer,
        product?.name,
        product?.sku,
        product?.barcode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(term);
    });
  }, [tasks, data.orders, data.products, filter, query]);
  const selected =
    filtered.find((task) => task.id === selectedId) ?? filtered[0];
  const selectedOrder = selected?.orderId
    ? data.orders.find((order) => order.id === selected.orderId)
    : undefined;
  const selectedProduct = selected?.productId
    ? data.products.find((p) => p.id === selected.productId)
    : undefined;
  const visible = filtered.slice(0, limit);

  return (
    <section className="action-center" aria-label="Günlük operasyon işleri">
      <div className="action-topline">
        <div>
          <span className="action-eyebrow">GÜNLÜK ÇALIŞMA ALANI</span>
          <h2>Önce ne yapılmalı?</h2>
        </div>
        <div className="action-topstats" aria-label="İş durumu">
          <span>
            <strong>{counts.ISSUE}</strong> müdahale
          </span>
          <span>
            <strong>{counts.FULFILL}</strong> işlem
          </span>
          <span>
            <strong>{counts.DOCUMENT}</strong> belge
          </span>
        </div>
      </div>

      <div className="action-filters" aria-label="İş türü filtresi">
        <div
          className="action-tabs"
          role="group"
          aria-label="Operasyon filtreleri"
        >
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => {
                setFilter(item.id);
                setSelectedId(null);
                setLimit(30);
              }}
            >
              {item.label} <span>{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <label className="action-search">
          <Search size={16} />
          <input
            aria-label="İşlerde ara"
            type="search"
            placeholder="Sipariş, SKU, müşteri..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId(null);
              setLimit(30);
            }}
          />
        </label>
      </div>

      <div className="action-workspace">
        <div className="action-list" aria-label="Öncelikli iş listesi">
          <div className="action-list-head">
            <span>
              <SlidersHorizontal size={14} /> Öncelik sırası
            </span>
            <span>{filtered.length} kayıt</span>
          </div>
          {visible.map((task) => {
            const Icon = laneIcons[task.lane];
            return (
              <button
                key={task.id}
                className="action-list-row"
                data-lane={task.lane}
                data-selected={selected?.id === task.id}
                aria-pressed={selected?.id === task.id}
                type="button"
                onClick={() => setSelectedId(task.id)}
              >
                <span className="action-task-icon">
                  <Icon size={17} />
                </span>
                <span className="action-task-main">
                  <strong>{task.reference}</strong>
                  <span>{task.title}</span>
                  <small>{task.reason}</small>
                </span>
                <ArrowRight size={16} className="action-row-arrow" />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="action-empty">
              <ClipboardList size={24} />
              <strong>Bu görünümde bekleyen iş yok</strong>
              <small>
                Diğer filtreleri veya arama terimini kontrol edebilirsin.
              </small>
            </div>
          )}
          {filtered.length > limit && (
            <button
              type="button"
              className="action-more"
              onClick={() => setLimit((current) => current + 30)}
            >
              Sonraki {Math.min(30, filtered.length - limit)} işi göster
            </button>
          )}
        </div>

        <div className="action-context" aria-label="Seçili işin ayrıntısı">
          {selected ? (
            <>
              <div className="action-context-head">
                <span className="action-lane" data-lane={selected.lane}>
                  {selected.lane === "ISSUE" && <ShieldAlert size={14} />}
                  {laneLabels[selected.lane]}
                </span>
                <span className="action-ref">{selected.reference}</span>
              </div>
              <h3>{selected.title}</h3>
              <p className="action-reason">{selected.reason}</p>
              {selectedOrder && (
                <dl className="action-facts">
                  <div>
                    <dt>Sipariş</dt>
                    <dd>{selectedOrder.number}</dd>
                  </div>
                  <div>
                    <dt>Alıcı</dt>
                    <dd>{selectedOrder.customer}</dd>
                  </div>
                  <div>
                    <dt>Model</dt>
                    <dd>{selectedOrder.fulfillment}</dd>
                  </div>
                  <div>
                    <dt>Kalem</dt>
                    <dd>{selectedOrder.lines.length}</dd>
                  </div>
                </dl>
              )}
              {selectedProduct && (
                <div className="action-product">
                  <small>İlgili ürün</small>
                  <strong>{selectedProduct.name}</strong>
                  <span>
                    {selectedProduct.sku} · {selectedProduct.available}{" "}
                    kullanılabilir / {selectedProduct.reserved} rezerve
                  </span>
                </div>
              )}
              <div className="action-context-bottom">
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() => onAction(selected)}
                >
                  {selected.action} <ArrowRight size={16} />
                </button>
                {selected.orderId && (
                  <button
                    type="button"
                    className="action-outline"
                    disabled={busy}
                    onClick={() => onOpenOrder(selected.orderId!)}
                  >
                    Siparişin tamamı <ArrowUpRight size={15} />
                  </button>
                )}
              </div>
              <p className="action-disclaimer">
                İşler mevcut demo kayıtlarından hesaplanır. Sevkiyat, stok veya
                belge durumu bu ekrandan otomatik değiştirilmez.
              </p>
            </>
          ) : (
            <div className="action-context-placeholder">
              <ClipboardList size={28} />
              <p>Seçili filtrede inceleme gerektiren kayıt bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
