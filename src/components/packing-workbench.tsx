"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Boxes,
  RefreshCw,
  ScanBarcode,
  Search,
  Truck,
} from "lucide-react";
import type { Order, WorkspaceSnapshot } from "@/domain/types";
import { statusLabels } from "@/domain/types";
import type { Command } from "@/domain/orders/commands";
import {
  packingQueue,
  packingShortages,
  type PackingLane,
} from "@/domain/orders/packing";
import "./packing-v2.css";

const lanes: { id: PackingLane; label: string }[] = [
  { id: "ALL", label: "Tüm bekleyenler" },
  { id: "NEW", label: "Rezervasyona uygun" },
  { id: "ACTIVE", label: "Hazırlamada" },
  { id: "READY", label: "Sevke hazır" },
  { id: "BLOCKED", label: "Stok engeli" },
];

type LeaseAction = "STATUS" | "CLAIM" | "RENEW" | "RELEASE" | "TAKE_OVER";
type PackingLeaseState = {
  mine: boolean;
  operatorName: string | null;
  expiresAt: string | null;
};

type Props = {
  data: WorkspaceSnapshot;
  initialOrderId?: string | null;
  busy: boolean;
  onCommand: (command: Command) => Promise<unknown>;
  onOpen: (orderId: string) => void;
  onRefresh: () => Promise<void>;
};

export function PackingWorkbench({
  data,
  busy,
  onCommand,
  onOpen,
  onRefresh,
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

  async function shipAndContinue(order: Order, terminalId: string) {
    await onCommand({ action: "SHIP", orderId: order.id, terminalId });
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
            onRefresh={onRefresh}
            onShip={(terminalId) => shipAndContinue(active, terminalId)}
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
  onRefresh,
  onShip,
  onSkip,
  onOpen,
}: Omit<Props, "onOpen"> & {
  order: Order;
  hasNext: boolean;
  onShip: (terminalId: string) => Promise<void>;
  onSkip: () => void;
  onOpen: () => void;
}) {
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const scanRunning = useRef(false);
  const scanQueue = useRef<string[]>([]);
  const activeScan = useRef<string | null>(null);
  const disposed = useRef(false);
  const predictedTotal = useRef(
    order.lines.reduce((sum, line) => sum + line.packed, 0),
  );
  const confirmedByProduct = useRef(
    new Map(order.lines.map((line) => [line.product_id, line.packed])),
  );
  const [waiting, setWaiting] = useState(0);
  const [lease, setLease] = useState<PackingLeaseState | null>(null);
  const [leaseBusy, setLeaseBusy] = useState(false);
  const [leaseError, setLeaseError] = useState("");
  const terminalId = useRef("");
  const ownsLease = useRef(false);
  const hasLease = lease?.mine === true;
  const locked = busy || pending || leaseBusy;
  const scannable = ["RESERVED", "PACKING"].includes(order.status);
  const total = order.lines.reduce((n, l) => n + l.quantity, 0);
  const packed = order.lines.reduce((n, l) => n + l.packed, 0);
  const shortages = packingShortages(order, data.products);
  const catalog = new Map(data.products.map((p) => [p.id, p]));

  const requestLease = useCallback(
    async (action: LeaseAction): Promise<PackingLeaseState> => {
      const response = await fetch("/api/packing-lease", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          orderId: order.id,
          terminalId: terminalId.current,
          generation: data.workspace.generation,
        }),
        keepalive: action === "RELEASE",
      });
      const result = (await response.json()) as PackingLeaseState & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Terminal işlemi başarısız");
      ownsLease.current = result.mine;
      setLease(result);
      return result;
    },
    [order.id, data.workspace.generation],
  );

  useEffect(() => {
    terminalId.current = crypto.randomUUID();
    ownsLease.current = false;
    void requestLease("STATUS").catch((error: unknown) =>
      setLeaseError(error instanceof Error ? error.message : "Terminal okunamadı"),
    );
    const heartbeat = window.setInterval(() => {
      if (!ownsLease.current) return;
      void requestLease("RENEW").catch((error: unknown) => {
        ownsLease.current = false;
        setLease(null);
        setLeaseError(
          (error instanceof Error ? error.message : "Terminal bağlantısı kesildi") +
            " Siparişi yenileyip tekrar üstlenin.",
        );
      });
    }, 40000);
    return () => {
      window.clearInterval(heartbeat);
      if (!ownsLease.current) return;
      ownsLease.current = false;
      void fetch("/api/packing-lease", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RELEASE",
          orderId: order.id,
          terminalId: terminalId.current,
          generation: data.workspace.generation,
        }),
        keepalive: true,
      });
    };
  }, [requestLease, order.id, data.workspace.generation]);

  async function changeLease(action: LeaseAction) {
    if (leaseBusy || pending) return;
    setLeaseBusy(true);
    setLeaseError("");
    try {
      await requestLease(action);
    } catch (error) {
      setLeaseError(error instanceof Error ? error.message : "Sahiplik değiştirilemedi");
      try {
        await requestLease("STATUS");
      } catch {
        setLease(null);
      }
    } finally {
      setLeaseBusy(false);
    }
  }

  useEffect(() => {
    if (scannable && hasLease && !locked) inputRef.current?.focus();
  }, [scannable, hasLease, locked]);

  useEffect(() => {
    if (scanRunning.current || scanQueue.current.length) return;
    predictedTotal.current = order.lines.reduce(
      (sum, line) => sum + line.packed,
      0,
    );
    confirmedByProduct.current = new Map(
      order.lines.map((line) => [line.product_id, line.packed]),
    );
  }, [order.lines]);

  useEffect(() => {
    const focusScanner = (event: KeyboardEvent) => {
      if (
        event.key !== "F8" ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (!scannable || !hasLease) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", focusScanner);
    return () => document.removeEventListener("keydown", focusScanner);
  }, [scannable, hasLease]);

  useEffect(() => {
    // React Strict Mode re-runs mount effects in development.
    disposed.current = false;
    return () => {
      disposed.current = true;
      scanQueue.current = [];
    };
  }, []);

  async function drainScans() {
    if (scanRunning.current || inFlight.current || disposed.current) return;
    scanRunning.current = true;
    inFlight.current = true;
    setPending(true);
    setError("");
    setMessage("");
    let processed = 0;
    try {
      while (scanQueue.current.length && !disposed.current) {
        const next = scanQueue.current.shift()!;
        activeScan.current = next;
        setWaiting(scanQueue.current.length);
        await onCommand({
          action: "SCAN",
          orderId: order.id,
          barcode: next,
          expectedPackedTotal: predictedTotal.current,
          terminalId: terminalId.current,
        });
        predictedTotal.current += 1;
        const product = data.products.find((p) => p.barcode === next);
        if (product) {
          confirmedByProduct.current.set(
            product.id,
            (confirmedByProduct.current.get(product.id) ?? 0) + 1,
          );
        }
        activeScan.current = null;
        processed += 1;
      }
      if (!disposed.current && processed) {
        setMessage(processed + " adet doğrulandı. Kayıtlar güncellendi.");
      }
    } catch (e) {
      const discarded = scanQueue.current.length;
      scanQueue.current = [];
      setWaiting(0);
      if (!disposed.current) {
        setError(
          (e instanceof Error ? e.message : "Doğrulama tamamlanamadı") +
            (discarded
              ? " · " + discarded + " bekleyen okutma iptal edildi."
              : "") +
            " Otomatik tekrar yapılmadı; siparişi yenileyip kontrol edin.",
        );
      }
    } finally {
      activeScan.current = null;
      scanRunning.current = false;
      inFlight.current = false;
      if (!disposed.current) {
        setPending(false);
        setWaiting(0);
        inputRef.current?.focus();
      }
    }
  }

  function queueBarcode() {
    const code = barcode.trim();
    if (!code || disposed.current || !scannable || !hasLease) return;
    if (inFlight.current && !scanRunning.current) {
      setError("Önce mevcut işlemin tamamlanmasını bekleyin.");
      return;
    }
    const product = data.products.find((p) => p.barcode === code);
    const line = order.lines.find((l) => l.product_id === product?.id);
    if (!line || !product) {
      setError("Barkod bu siparişe ait değil; kayıt yapılmadı.");
      inputRef.current?.select();
      return;
    }
    const queued =
      scanQueue.current.filter((item) => item === code).length +
      (activeScan.current === code ? 1 : 0);
    const confirmed = confirmedByProduct.current.get(product.id) ?? line.packed;
    if (confirmed + queued >= line.quantity) {
      setError("Bu üründe doğrulanabilecek adet kalmadı.");
      inputRef.current?.select();
      return;
    }
    if (scanQueue.current.length >= 30) {
      setError(
        "Okutma kuyruğu dolu. Önce bekleyen kodların doğrulanmasını bekleyin.",
      );
      return;
    }
    setError("");
    setBarcode("");
    scanQueue.current.push(code);
    setWaiting(scanQueue.current.length);
    void drainScans();
  }

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
        <div className="packing-station-tools">
          <button
            type="button"
            disabled={locked}
            onClick={() => void onRefresh()}
          >
            <RefreshCw size={15} /> Yenile
          </button>
          <button type="button" disabled={locked} onClick={onOpen}>
            Geçmiş ve detay ↗
          </button>
        </div>
      </header>
      <div className="packing-lease-status" role="status" aria-live="polite">
        <div>
          <strong>
            {hasLease
              ? "Bu sipariş bu terminalde"
              : lease?.operatorName
                ? "Başka terminalde hazırlanıyor"
                : lease
                  ? "Henüz üstlenilmedi"
                  : "Terminal durumu kontrol ediliyor"}
          </strong>
          <small>
            {lease?.operatorName
              ? "Operatör: " + lease.operatorName
              : "Her siparişi bir terminal üstlenir."}
          </small>
        </div>
        <div className="packing-lease-buttons">
          {hasLease ? (
            <button type="button" disabled={locked} onClick={() => void changeLease("RELEASE")}>
              Bırak
            </button>
          ) : (
            <>
              <button type="button" disabled={locked} onClick={() => void changeLease("CLAIM")}>
                Siparişi üstlen
              </button>
              {data.actor.role === "ADMIN" && lease?.operatorName && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void changeLease("TAKE_OVER")}
                >
                  Yönetici olarak devral
                </button>
              )}
            </>
          )}
          <button type="button" disabled={locked} onClick={() => void changeLease("STATUS")}>
            Durumu yenile
          </button>
        </div>
      </div>
      {leaseError && <p className="error" role="alert">{leaseError}</p>}
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
      {scannable && hasLease && (
        <form
          className="packing-scanner"
          onSubmit={(e) => {
            e.preventDefault();
            queueBarcode();
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  queueBarcode();
                }
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="Barkod + Enter"
            />
            <button
              type="submit"
              className="primary"
              disabled={!barcode.trim() || (locked && !pending)}
            >
              Doğrula
            </button>
          </div>
          <small>
            Her Enter bir adettir · F8: barkoda odaklan · Kodlar sırayla
            işlenir, başarısız işlem otomatik tekrarlanmaz.
          </small>
          {(pending || waiting > 0) && (
            <div
              className="packing-scan-queue"
              role="status"
              aria-live="polite"
            >
              Barkod işleniyor · {waiting} kod sırada
            </div>
          )}
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="packing-feedback" role="status" aria-live="polite">
        {pending ? "İşlem sürüyor…" : message}
      </p>
      <footer>
        <button type="button" disabled={locked || !hasNext} onClick={onSkip}>
          Sonraki sipariş <ArrowRight size={16} />
        </button>
        {order.status === "NEW" && (
          <button
            type="button"
            className="primary"
            disabled={locked || !hasLease || shortages.length > 0}
            onClick={() =>
              void perform(
                () => onCommand({ action: "RESERVE", orderId: order.id, terminalId: terminalId.current }),
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
            disabled={locked || !hasLease}
            onClick={() => void perform(() => onShip(terminalId.current), "Sevkiyat kaydedildi.")}
          >
            <Truck size={17} /> Sevk et ve sıradakine geç
          </button>
        )}
      </footer>
    </section>
  );
}
