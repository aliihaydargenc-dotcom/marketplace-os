"use client";
import { effectiveUnitCost } from "@/domain/finance/calculations";
import { useRef, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import type { WorkspaceSnapshot } from "@/domain/types";
import type { Command } from "@/domain/orders/commands";
import {
  returnQueue,
  returnLabels,
  waitingHours,
  returnDecisionBlock,
  type ReturnLane,
  type ReturnQueueItem,
} from "@/domain/inventory/returns";
import { QuotedAmount } from "./currency-display";
import { financialSummary } from "@/domain/finance/calculations";
import "./returns-workbench.css";
type Props = {
  data: WorkspaceSnapshot;
  busy: boolean;
  onCommand: (command: Command) => Promise<unknown>;
  onOpen: (id: string) => void;
  onRefresh: () => Promise<void>;
};
const stamp = (value: string) =>
  new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export function ReturnsWorkbench({
  data,
  busy,
  onCommand,
  onOpen,
  onRefresh,
}: Props) {
  const [lane, setLane] = useState<ReturnLane>("PENDING"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [feedback, setFeedback] = useState("");
  const queue = returnQueue(
      data.returns,
      data.orders,
      data.products,
      lane,
      search,
    ),
    active = queue.find((i) => i.order.id === selected) ?? queue[0];
  // Approximate age at opening or an explicit refresh; no SLA or live timer.
  const [now, setNow] = useState(() => Date.now());
  return (
    <section
      className="returns-workbench"
      aria-label="İade kalite kontrol çalışma alanı"
    >
      <div className="returns-heading">
        <div>
          <h2>
            <RotateCcw size={18} />
            İade ve kalite kontrol
          </h2>
          <p>FBS · En eski iade önce · Tüm tarihler · Tam sipariş kararı</p>
        </div>
        <button
          disabled={busy}
          onClick={() => {
            void onRefresh().then(() => setNow(Date.now()));
          }}
        >
          Kuyruğu yenile
        </button>
      </div>
      <div className="returns-toolbar">
        <div className="returns-lanes" aria-label="İade kuyrukları">
          {(["PENDING", "ACCEPTED", "REJECTED", "ALL"] as const).map((id) => (
            <button
              key={id}
              disabled={busy}
              aria-pressed={lane === id}
              onClick={() => {
                setLane(id);
                setSelected(null);
                setFeedback("");
              }}
            >
              {id === "ALL" ? "Tüm iadeler" : returnLabels[id]}{" "}
              <b>
                {
                  returnQueue(
                    data.returns,
                    data.orders,
                    data.products,
                    id,
                    search,
                  ).length
                }
              </b>
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="İade kuyruğunda ara"
            placeholder="Sipariş, ürün, barkod veya gerekçe…"
            disabled={busy}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(null);
            }}
          />
        </label>
      </div>
      {feedback && (
        <p role="status" className="returns-message">
          {feedback}
        </p>
      )}
      <div className="returns-layout">
        <aside className="returns-queue" aria-label="İade kayıtları">
          {queue.map((item) => (
            <button
              disabled={busy}
              key={item.order.id}
              aria-pressed={active?.order.id === item.order.id}
              onClick={() => {
                setSelected(item.order.id);
                setFeedback("");
              }}
            >
              <span>
                <strong>{item.order.number}</strong>
                <span className={`badge ${item.record.status.toLowerCase()}`}>
                  {returnLabels[item.record.status]}
                </span>
              </span>
              <small>
                {item.order.lines.length} SKU ·{" "}
                {item.order.lines.reduce((n, l) => n + l.quantity, 0)} adet ·{" "}
                {stamp(item.record.created_at)}
              </small>
              <p>{item.record.reason}</p>
              <small>
                {item.record.status === "PENDING"
                  ? `${waitingHours(item.record, now)} saattir bekliyor`
                  : item.record.reviewed_at
                    ? `Karar: ${stamp(item.record.reviewed_at)}`
                    : "Karar tarihi kayıtlı değil"}
              </small>
            </button>
          ))}
          {!queue.length && (
            <p className="returns-empty">Bu kuyrukta eşleşen iade yok.</p>
          )}
        </aside>
        {active ? (
          <ReturnStation
            key={`${data.workspace.generation}:${active.order.id}:${active.record.status}`}
            {...{ data, busy, onCommand, onOpen, onRefresh }}
            item={active}
            onCompleted={() => {
              setSelected(null);
              setFeedback(
                "Sunucu yanıtı alındı. Güncel kararı tamamlanan iadelerden kontrol edebilirsiniz.",
              );
            }}
          />
        ) : (
          <div className="returns-empty">
            <h3>İade kuyruğu boş</h3>
            <p>
              Filtreyi değiştirin veya yeni iade kaydını Siparişler ekranından
              oluşturun.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
function ReturnStation({
  data,
  busy,
  onCommand,
  onOpen,
  item,
  onCompleted,
}: Props & { item: ReturnQueueItem; onCompleted: () => void }) {
  const [reason, setReason] = useState(""),
    [decision, setDecision] = useState<"ACCEPT" | "REJECT" | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [ambiguous, setAmbiguous] = useState(false);
  const inFlight = useRef(false);
  const { order, record } = item,
    locked = busy || pending,
    block = returnDecisionBlock(item, data.products, data.ledger);
  const catalog = new Map(data.products.map((p) => [p.id, p]));
  const movements = data.ledger.filter(
    (l) =>
      l.reference === order.id &&
      ["RETURN_RECEIPT", "QC_RELEASE", "QC_REJECT"].includes(l.kind),
  );
  const financial = financialSummary(
    data.financial.filter((f) => f.order_id === order.id),
    order.currency,
  );
  const originalEvent = data.audit.find(
      (e) => e.reference === order.id && e.action === "RETURN",
    ),
    originalReason =
      typeof originalEvent?.details.reason === "string"
        ? originalEvent.details.reason
        : null;
  async function submit() {
    if (
      inFlight.current ||
      locked ||
      block ||
      !decision ||
      !confirmed ||
      reason.trim().length < 3 ||
      ambiguous
    )
      return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      await onCommand({
        action: "QC",
        orderId: order.id,
        accept: decision === "ACCEPT",
        reason: reason.trim(),
      });
      onCompleted();
    } catch (e) {
      setError((e as Error).message);
      setAmbiguous(true);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <section className="return-station" aria-label="Seçili iade kontrolü">
      <header>
        <div>
          <small>İADE EDİLEN SİPARİŞ</small>
          <h3>{order.number}</h3>
          <p>
            {order.customer} · {stamp(record.created_at)}
          </p>
        </div>
        <button disabled={locked} onClick={() => onOpen(order.id)}>
          Sipariş geçmişi ↗
        </button>
      </header>
      <div className="return-reason">
        <strong>
          {record.status === "PENDING"
            ? "İade gerekçesi"
            : "Kayıtlı kontrol gerekçesi"}
        </strong>
        <p>{record.reason}</p>
        {originalReason && originalReason !== record.reason && (
          <p>İlk iade gerekçesi: {originalReason}</p>
        )}
        {record.status !== "PENDING" && !originalReason && (
          <small>İlk iade gerekçesi ayrı audit kaydında bulunamadı.</small>
        )}
      </div>
      <div className="return-table">
        <table aria-label="İade ürünleri">
          <thead>
            <tr>
              <th>Ürün / SKU / barkod</th>
              <th>İade adedi</th>
              <th>Bu iadede karantina</th>
              <th>Güncel satılabilir</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => {
              const p = catalog.get(line.product_id),
                quarantine = movements
                  .filter(
                    (l) =>
                      l.product_id === line.product_id &&
                      l.warehouse_id === "QUARANTINE",
                  )
                  .reduce((n, l) => n + l.quantity, 0);
              return (
                <tr key={line.product_id}>
                  <td>
                    <strong>{p?.name ?? "Ürün kartı bulunamadı"}</strong>
                    <small>
                      {p?.sku ?? line.product_id} · {p?.variant}
                    </small>
                    <code>{p?.barcode}</code>
                  </td>
                  <td>{line.quantity}</td>
                  <td>{quarantine}</td>
                  <td>{p?.available ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {record.status === "PENDING" ? (
        <>
          <div className="return-impact">
            <strong>Karar öncesi stok ve finans etkisi</strong>
            <p>
              Kabul: karantinadaki tüm adetler ana depoya alınır. Ret:
              karantinadan çıkar, satılabilir stok artmaz.
            </p>
            <small>
              Demo politikası: satış iadesi iade kaydı açılırken yazılır. QC
              kabulü, varsa ürün maliyetini geri alır; ret maliyet kaybını
              korur. Komisyon ve lojistik otomatik iade edilmez.
            </small>
          </div>
          {block ? (
            <p role="alert" className="danger-text">
              {block}
            </p>
          ) : (
            <form
              className="return-decision form"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <fieldset disabled={locked || ambiguous}>
                <legend>Kontrol sonucu · bütün ürünler için</legend>
                <label>
                  <input
                    type="radio"
                    name={`decision-${order.id}`}
                    checked={decision === "ACCEPT"}
                    onChange={() => {
                      setDecision("ACCEPT");
                      setConfirmed(false);
                    }}
                  />
                  Satışa uygun · ana depoya al
                </label>
                <label>
                  <input
                    type="radio"
                    name={`decision-${order.id}`}
                    checked={decision === "REJECT"}
                    onChange={() => {
                      setDecision("REJECT");
                      setConfirmed(false);
                    }}
                  />
                  Satışa uygun değil · stoğa ekleme
                </label>
                <label htmlFor={`qc-reason-${order.id}`}>
                  Kontrol gerekçesi
                </label>
                <textarea
                  id={`qc-reason-${order.id}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  minLength={3}
                  maxLength={300}
                  placeholder="Ambalaj, ürün durumu ve kontrol bulgusu…"
                />
                <label>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  Tüm ürün ve adetleri kontrol ettim; bu kararın stok etkisini
                  onaylıyorum.
                </label>
              </fieldset>
              <p className="returns-hint">
                Tam sipariş iadesi desteklenir. Ürün bazında kısmi kabul/ret ve
                sonradan karar değiştirme bu sürümde yoktur.
              </p>
              <button
                className="primary"
                disabled={
                  locked ||
                  ambiguous ||
                  !decision ||
                  !confirmed ||
                  reason.trim().length < 3
                }
              >
                {pending
                  ? "Karar kaydediliyor…"
                  : decision === "ACCEPT"
                    ? "Kabul et ve ana depoya al"
                    : decision === "REJECT"
                      ? "Reddet · satılabilir stoğa ekleme"
                      : "Kararı seçin"}
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="return-impact">
          <strong>{returnLabels[record.status]}</strong>
          <p>
            {record.reviewed_at
              ? `Karar tarihi: ${stamp(record.reviewed_at)}`
              : "Karar tarihi kayıtlı değil"}{" "}
            · Bu kayıt tamamlanmış; yeni QC komutu gönderilmez.
          </p>
        </div>
      )}
      {error && (
        <p className="danger-text" role="alert">
          {error}
        </p>
      )}
      {ambiguous && (
        <div className="return-impact">
          <p>
            İşlemin sonucu belirsiz olabilir. Tekrar karar göndermeden önce
            kayıtları yenileyin ve güncel durumu kontrol edin.
          </p>
          <button disabled={locked} onClick={() => window.location.reload()}>
            Sayfayı yenile ve durumu kontrol et
          </button>
        </div>
      )}
      <div className="return-finance">
        <h4>İadeye bağlı finans kayıtları</h4>
        {data.actor.role === "WAREHOUSE" ? (
          <p>Finans tutarları için yönetici veya muhasebe görünümü gerekir.</p>
        ) : (
          <>
            <div>
              <span>
                Kaydedilmiş satış iadesi{" "}
                <QuotedAmount
                  amount={financial.refunds}
                  currency={order.currency}
                />
              </span>
              <span>
                QC maliyet geri alımı{" "}
                <QuotedAmount
                  amount={data.financial
                    .filter(
                      (f) =>
                        f.order_id === order.id && f.kind === "COGS_REVERSAL",
                    )
                    .reduce((n, f) => n + f.amount, 0)}
                  currency={order.currency}
                />
              </span>
            </div>
            <small>
              {order.lines.some((l) => effectiveUnitCost(order, l) === null)
                ? "Eksik ürün maliyeti var; maliyet etkisi tam hesaplanamaz."
                : "Tutarlar kayıtlı işlem para biriminde; küçük karşılıklar güncel TCMB değerlemesidir."}
            </small>
          </>
        )}
      </div>
      <details className="return-history">
        <summary>İade stok hareketleri · {movements.length} kayıt</summary>
        <div className="return-table">
          <table aria-label="İade hareket geçmişi">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Ürün</th>
                <th>Hareket / depo</th>
                <th>Adet</th>
                <th>Gerekçe / personel</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((l) => (
                <tr key={l.id}>
                  <td>{stamp(l.created_at)}</td>
                  <td>{catalog.get(l.product_id)?.sku ?? l.product_id}</td>
                  <td>
                    {{
                      RETURN_RECEIPT: "İade kabulü",
                      QC_RELEASE: "QC kabulü",
                      QC_REJECT: "QC reddi",
                    }[l.kind] ?? l.kind}{" "}
                    / {l.warehouse_id === "MAIN" ? "Ana depo" : "Karantina"}
                  </td>
                  <td>
                    {l.quantity > 0 ? "+" : ""}
                    {l.quantity}
                  </td>
                  <td>
                    {l.reason}
                    <small>{l.actor}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
