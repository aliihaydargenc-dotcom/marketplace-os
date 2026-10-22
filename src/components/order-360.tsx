"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  AlertCircle,
  CircleCheck,
  Clock3,
  SearchCheck,
} from "lucide-react";
import type { Order, WorkspaceSnapshot } from "@/domain/types";
import {
  order360View,
  type Order360Area,
  type Order360Source,
} from "@/domain/orders/order-360";
import { displayMoney } from "./currency-display";
import "./order-360.css";

const statusText = {
  DONE: "Kayıtlı",
  CURRENT: "İşlem gerekli",
  PENDING: "Bekliyor",
  NOT_APPLICABLE: "Kapsam dışı",
};
const sourceText: Record<Order360Source, string> = {
  ORDER: "Sipariş",
  AUDIT: "İşlem",
  STOCK: "Stok",
  FINANCE: "Finans",
  INVOICE: "Belge",
  RETURN: "İade / QC",
  INTEGRATION: "Demo bağlantı",
};
type TraceFilter = "ALL" | Order360Source;
const traceFilters: { key: TraceFilter; text: string }[] = [
  { key: "ALL", text: "Tümü" },
  { key: "AUDIT", text: "İşlem" },
  { key: "STOCK", text: "Stok" },
  { key: "INVOICE", text: "Belge" },
  { key: "FINANCE", text: "Finans" },
  { key: "RETURN", text: "İade" },
  { key: "INTEGRATION", text: "Demo bağlantı" },
];

function goTo(area: Order360Area) {
  const element = document.getElementById("order360-" + area);
  element?.scrollIntoView({ block: "start", behavior: "smooth" });
  element?.focus({ preventScroll: true });
}

export function Order360Overview({
  order,
  data,
}: {
  order: Order;
  data: WorkspaceSnapshot;
}) {
  const view = useMemo(() => order360View(order, data), [order, data]);
  return (
    <section
      className="order360-overview"
      aria-label="Sipariş 360 derece süreç görünümü"
    >
      <div className="order360-section-head">
        <div>
          <strong>Sipariş 360°</strong>
          <small>Gerçek demo kayıtları · işlem ve belge kanıtları</small>
        </div>
        <nav className="order360-jump" aria-label="Sipariş içi gezinme">
          <button type="button" onClick={() => goTo("products")}>
            Ürünler
          </button>
          {order.fulfillment === "FBS" && (
            <button type="button" onClick={() => goTo("operations")}>
              İşlemler
            </button>
          )}
          {data.actor.role !== "WAREHOUSE" && (
            <button type="button" onClick={() => goTo("finance")}>
              Finans
            </button>
          )}
          <button type="button" onClick={() => goTo("trace")}>
            Kayıtlar
          </button>
        </nav>
      </div>
      <ol className="order360-steps" aria-label="Sipariş aşamaları">
        {view.steps.map((step) => (
          <li key={step.id} data-state={step.state} title={step.detail}>
            <span className="order360-step-icon" aria-hidden="true">
              {step.state === "DONE" ? (
                <CircleCheck size={15} />
              ) : step.state === "CURRENT" ? (
                <Clock3 size={15} />
              ) : (
                <span>·</span>
              )}
            </span>
            <span>
              <strong>{step.label}</strong>
              <small>{statusText[step.state]}</small>
            </span>
          </li>
        ))}
      </ol>
      {view.signals.length > 0 && (
        <div className="order360-signals" aria-label="İlgilenilecek işler">
          {view.signals.map((signal) => (
            <div
              key={signal.id}
              className="order360-signal"
              data-level={signal.level}
            >
              <AlertCircle size={16} aria-hidden="true" />
              <div>
                <strong>{signal.title}</strong>
                <small>{signal.detail}</small>
              </div>
              <button type="button" onClick={() => goTo(signal.area)}>
                İncele <ArrowDownRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function Order360Trace({
  order,
  data,
}: {
  order: Order;
  data: WorkspaceSnapshot;
}) {
  const view = useMemo(() => order360View(order, data), [order, data]);
  const [filter, setFilter] = useState<TraceFilter>("ALL");
  const [expanded, setExpanded] = useState(false);
  const allowed = traceFilters.filter(
    (tab) =>
      data.actor.role !== "WAREHOUSE" ||
      !["INVOICE", "FINANCE"].includes(tab.key),
  );
  const events = view.events.filter(
    (event) => filter === "ALL" || event.source === filter,
  );
  const visible = expanded ? events : events.slice(0, 10);
  return (
    <section className="order360-trace" aria-label="Siparişin bağlı kayıtları">
      <div className="order360-trace-head">
        <strong>Birleşik kayıt zinciri</strong>
        <span>{events.length} kayıt</span>
      </div>
      <div
        role="group"
        aria-label="Kayıt türleri"
        className="order360-trace-filters"
      >
        {allowed.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={filter === tab.key}
            onClick={() => {
              setFilter(tab.key);
              setExpanded(false);
            }}
          >
            {tab.text}
          </button>
        ))}
      </div>
      <ol className="order360-events">
        {visible.map((event) => (
          <li key={event.id}>
            <time dateTime={event.time}>
              {new Date(event.time).toLocaleString("tr-TR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            <span className="order360-source">{sourceText[event.source]}</span>
            <div>
              <strong>{event.title}</strong>
              <small>{event.description}</small>
            </div>
            {event.amount && (
              <b>{displayMoney(event.amount.value, event.amount.currency)}</b>
            )}
          </li>
        ))}
      </ol>
      {events.length === 0 && (
        <div className="order360-no-events">
          <SearchCheck size={18} /> Bu türde bağlı kayıt bulunamadı.
        </div>
      )}
      {events.length > 10 && (
        <button
          className="order360-expand"
          type="button"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? "İlk 10 kaydı göster"
            : "Tüm " + events.length + " kaydı göster"}
        </button>
      )}
      <p className="order360-disclaimer">
        Yalnız kayıtlı hareketler gösterilir; işlem zinciri gerçek Ozon/Paraşüt
        entegrasyonu veya mali mutabakat onayı değildir.
      </p>
    </section>
  );
}
