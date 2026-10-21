"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Boxes, ScanBarcode, Search, Truck } from "lucide-react";
import type { Order, WorkspaceSnapshot } from "@/domain/types";
import { statusLabels } from "@/domain/types";
import type { Command } from "@/domain/orders/commands";
import {
  packingQueue,
  packingShortages,
  type PackingLane,
} from "@/domain/orders/packing";

const lanes: { id: PackingLane; label: string }[] = [
  { id: "ALL", label: "Tüm bekleyenler" },
  { id: "NEW", label: "Rezervasyona uygun" },
  { id: "ACTIVE", label: "Hazırlamada" },
  { id: "READY", label: "Sevke hazır" },
  { id: "BLOCKED", label: "Stok engeli" },
];

type Props = {
  data: WorkspaceSnapshot;
  initialOrderId?: string | null;
  busy: boolean;
  onCommand: (command: Command) => Promise<unknown>;
  onOpen: (orderId: string) => void;
};

export function PackingWorkbench({
  data,
  busy,
  onCommand,
  onOpen,
  initialOrderId,
}: Props) {
  const [lane, setLane] = useState<PackingLane>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrderId ?? null,
  );
  const [feedback, setFeedback] = useState("");
  const queue = packingQueue(data.orders, data.products, lane, search);
  const active = queue.find((o) => o.id === selectedId) ?? queue[0];
  const next = active
    ? queue[(queue.findIndex((o) => o.id === active.id) + 1) % queue.length]
    : undefined;

  async function shipAndContinue(order: Order) {
    await onCommand({ action: "SHIP", orderId: order.id });
    setSelectedId(next?.id !== order.id ? (next?.id ?? null) : null);
    setFeedback(
      `${order.number} sevk edildi. Stok ve bağlı kayıtlar güncellendi.`,
    );
  }

  return (
    <section
      className="packing-workbench"
      aria-label="FBS hazırlama çalışma alanı"
    >
      <div className="packing-heading">
        <div>
          <h2>
            <ScanBarcode size={20} /> Hazırlama masası
          </h2>
          <p>
            FBS · En eski sipariş önce · Tüm tarihler · Her sevkiyat sizin
            onayınızla
          </p>
        </div>
        <span className="packing-count">
          {packingQueue(data.orders, data.products, "ALL", "").length} bekleyen
          sipariş
        </span>
      </div>
      <div className="packing-lanes" aria-label="Hazırlama kuyrukları">
        {lanes.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={lane === item.id}
            disabled={busy}
            onClick={() => {
              setLane(item.id);
              setSelectedId(null);
            }}
          >
            {item.label}
            <b>
              {packingQueue(data.orders, data.products, item.id, "").length}
            </b>
          </button>
        ))}
      </div>
      <div className="packing-layout">
        <aside className="packing-queue" aria-label="Hazırlanacak siparişler">
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Hazırlama kuyruğunda ara"
              placeholder="Sipariş, SKU veya barkod…"
              value={search}
              disabled={busy}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedId(null);
              }}
            />
          </label>
          <div className="packing-queue-list">
            {queue.map((order) => {
              const units = order.lines.reduce((n, l) => n + l.quantity, 0);
              const packed = order.lines.reduce((n, l) => n + l.packed, 0);
              const blocked = packingShortages(order, data.products).length > 0;
              return (
                <button
                  type="button"
                  key={order.id}
                  disabled={busy}
                  aria-pressed={active?.id === order.id}
                  onClick={() => {
                    setSelectedId(order.id);
                    setFeedback("");
                  }}
                >
                  <span>
                    <strong>{order.number}</strong>
                    <span className={`badge ${order.status.toLowerCase()}`}>
                      {statusLabels[order.status]}
                    </span>
                  </span>
                  <small>{order.customer}</small>
                  <span>
                    <small>
                      {order.lines.length} SKU · {packed}/{units} adet
                    </small>
                    <small>
                      {new Date(order.created_at).toLocaleDateString("tr-TR")}
                    </small>
                  </span>
                  {blocked && (
                    <small className="danger-text">
                      Stok yetersiz · Rezervasyon bekliyor
                    </small>
                  )}
                </button>
              );
            })}
            {!queue.length && (
              <p className="packing-empty">Bu kuyrukta eşleşen sipariş yok.</p>
            )}
          </div>
        </aside>
        {active ? (
          <PackingStation
            key={`${data.workspace.generation}:${active.id}`}
            order={active}
            data={data}
            busy={busy}
            hasNext={!!next && next.id !== active.id}
            onCommand={onCommand}
            onShip={() => shipAndContinue(active)}
            onSkip={() => {
              setSelectedId(next?.id ?? null);
              setFeedback("");
            }}
            onOpen={() => onOpen(active.id)}
          />
        ) : (
          <div className="packing-empty">
            <Boxes size={30} />
            <h3>Kuyruk tamamlandı veya filtre boş</h3>
            <p>Başka bir kuyruk seçin ya da aramayı temizleyin.</p>
          </div>
        )}
      </div>
      <div className="packing-feedback" role="status" aria-live="polite">
        {feedback}
      </div>
    </section>
  );
}

function PackingStation({
  order,
  data,
  busy,
  hasNext,
  onCommand,
  onShip,
  onSkip,
  onOpen,
}: Omit<Props, "onOpen"> & {
  order: Order;
  hasNext: boolean;
  onShip: () => Promise<void>;
  onSkip: () => void;
  onOpen: () => void;
}) {
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const locked = busy || pending;
  const scannable = ["RESERVED", "PACKING"].includes(order.status);
  const total = order.lines.reduce((n, l) => n + l.quantity, 0);
  const packed = order.lines.reduce((n, l) => n + l.packed, 0);
  const shortages = packingShortages(order, data.products);
  const catalog = new Map(data.products.map((p) => [p.id, p]));

  useEffect(() => {
    if (scannable && !locked) inputRef.current?.focus();
  }, [scannable, locked]);

  async function perform(action: () => Promise<unknown>, success: string) {
    if (inFlight.current || locked) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      setBarcode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem tamamlanamadı");
      inputRef.current?.select();
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <section className="packing-station" aria-label="Aktif sipariş hazırlama">
      <header>
        <div>
          <small>AKTİF SİPARİŞ</small>
          <h3>{order.number}</h3>
          <p>{order.customer}</p>
        </div>
        <button type="button" disabled={locked} onClick={onOpen}>
          Geçmiş ve detay ↗
        </button>
      </header>
      <div className="packing-progress">
        <span>
          {statusLabels[order.status]}
          <b>
            {packed} / {total} adet doğrulandı
          </b>
        </span>
        <progress
          aria-label="Sipariş hazırlama ilerlemesi"
          max={total}
          value={packed}
        />
      </div>
      <div className="packing-lines">
        <table aria-label="Hazırlama ürünleri">
          <thead>
            <tr>
              <th>Ürün / barkod</th>
              <th>Doğrulanan</th>
              <th>Kalan</th>
              <th>Kullanılabilir</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => {
              const product = catalog.get(line.product_id);
              return (
                <tr
                  key={line.product_id}
                  className={
                    line.packed === line.quantity ? "packing-line-done" : ""
                  }
                >
                  <td>
                    <strong>{product?.name ?? "Ürün bulunamadı"}</strong>
                    <small>
                      {product?.sku} · {product?.variant}
                    </small>
                    <code>{product?.barcode}</code>
                  </td>
                  <td>
                    {line.packed} / {line.quantity}
                  </td>
                  <td>
                    <b>{line.quantity - line.packed}</b>
                  </td>
                  <td>{product?.available ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {shortages.length > 0 && (
        <div className="info-box packing-shortages">
          <strong>Rezervasyon için stok yetersiz</strong>
          {shortages.map((s) => (
            <span key={s.productId}>
              {catalog.get(s.productId)?.sku ?? s.productId}: {s.missing} adet
              eksik
            </span>
          ))}
          <small>
            Başka siparişe geçebilir, stok girişinden sonra yeniden
            deneyebilirsiniz.
          </small>
        </div>
      )}
      {scannable && (
        <form
          className="packing-scanner"
          onSubmit={(e) => {
            e.preventDefault();
            if (!barcode.trim()) return;
            void perform(
              () =>
                onCommand({
                  action: "SCAN",
                  orderId: order.id,
                  barcode: barcode.trim(),
                }),
              "Bir adet doğrulandı.",
            );
          }}
        >
          <label htmlFor={`packing-barcode-${order.id}`}>
            <ScanBarcode size={20} /> Ürün barkodunu okutun
          </label>
          <div>
            <input
              id={`packing-barcode-${order.id}`}
              ref={inputRef}
              aria-label="Hazırlama barkodu"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              readOnly={locked}
              autoComplete="off"
              spellCheck={false}
              placeholder="Barkod + Enter"
            />
            <button
              type="submit"
              className="primary"
              disabled={locked || !barcode.trim()}
            >
              Doğrula
            </button>
          </div>
          <small>
            Her okutma bir adettir. Yanlış ürün ve fazla adet kabul edilmez.
          </small>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="packing-feedback" role="status" aria-live="polite">
        {pending ? "İşlem kaydediliyor…" : message}
      </p>
      <footer>
        <button type="button" disabled={locked || !hasNext} onClick={onSkip}>
          Sonraki sipariş <ArrowRight size={16} />
        </button>
        {order.status === "NEW" && (
          <button
            type="button"
            className="primary"
            disabled={locked || shortages.length > 0}
            onClick={() =>
              void perform(
                () => onCommand({ action: "RESERVE", orderId: order.id }),
                "Stok rezerve edildi. Barkod okutabilirsiniz.",
              )
            }
          >
            Stok rezerve et ve başla
          </button>
        )}
        {order.status === "READY" && (
          <button
            type="button"
            className="primary"
            disabled={locked}
            onClick={() => void perform(onShip, "Sevkiyat kaydedildi.")}
          >
            <Truck size={17} /> Sevk et ve sıradakine geç
          </button>
        )}
      </footer>
    </section>
  );
}
