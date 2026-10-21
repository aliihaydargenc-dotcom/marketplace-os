"use client";
import { useRef, useState } from "react";
import "./inventory-documents.css";
import type { WorkspaceSnapshot } from "@/domain/types";
import type { InventoryDocument } from "@/domain/inventory/documents";
import type { Command } from "@/domain/orders/commands";
type Run = (c: Command) => Promise<{ reference: string } | undefined>;
const kindLabel = { RECEIPT: "Mal kabul", COUNT: "Sayım" };
const statusLabel = {
  DRAFT: "Taslak",
  CONFIRMED: "Onaylandı",
  CANCELLED: "İptal",
};
export function InventoryDocuments({
  data,
  busy,
  run,
}: {
  data: WorkspaceSnapshot;
  busy: boolean;
  run: Run;
}) {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const docs = data.inventoryDocuments ?? [];
  const doc = docs.find((d) => d.id === selected);
  if (data.actor.role === "ACCOUNTANT") return null;
  return (
    <section className="panel inventory-documents">
      <div className="filterbar">
        <h3>Mal kabul ve sayım belgeleri</h3>
        <button
          disabled={busy}
          onClick={() => {
            setOpen(!open);
            setSelected(null);
          }}
        >
          Yeni belge
        </button>
        <select
          aria-label="Stok belgesi seç"
          value={selected ?? ""}
          onChange={(e) => {
            setSelected(e.target.value || null);
            setOpen(false);
            setError("");
          }}
        >
          <option value="">Belge seçin ({docs.length})</option>
          {docs.map((d) => (
            <option key={d.id} value={d.id}>
              {kindLabel[d.kind]} · {d.source_reference} ·{" "}
              {statusLabel[d.status]}
            </option>
          ))}
        </select>
      </div>
      {(open || doc?.status === "DRAFT") && (
        <DocumentEditor
          key={
            doc
              ? `${data.workspace.generation}:${doc.id}:${doc.version}`
              : `new:${data.workspace.generation}`
          }
          data={data}
          doc={doc}
          busy={busy}
          run={run}
          onSaved={(id) => {
            setSelected(id);
            setOpen(false);
          }}
        />
      )}
      {doc && (
        <>
          <p>
            <b>
              {kindLabel[doc.kind]} · {statusLabel[doc.status]}
            </b>{" "}
            · DEMO / TASLAK · Ana depo · {doc.id}
          </p>
          <p>
            {doc.source_reference} · {doc.reason}
            {doc.source_order_id && (
              <>
                {" "}
                · Sipariş:{" "}
                {data.orders.find((o) => o.id === doc.source_order_id)
                  ?.number ?? doc.source_order_id}
              </>
            )}
          </p>
          <p className="muted">
            Oluşturan: {doc.created_by} ·{" "}
            {new Date(doc.created_at).toLocaleString("tr-TR")}
            {doc.confirmed_at && (
              <>
                {" "}
                · Onay: {doc.confirmed_by} /{" "}
                {new Date(doc.confirmed_at).toLocaleString("tr-TR")}
              </>
            )}
            {doc.cancelled_at && (
              <>
                {" "}
                · İptal: {doc.cancelled_by} /{" "}
                {new Date(doc.cancelled_at).toLocaleString("tr-TR")}
              </>
            )}
          </p>
          <div className="document-lines">
            <table>
              <thead>
                <tr>
                  <th>SKU / ürün</th>
                  <th>Taslak fiziksel</th>
                  <th>
                    {doc.kind === "COUNT" ? "Sayılan fiziksel" : "Giriş adedi"}
                  </th>
                  <th>Stok farkı</th>
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((l) => (
                  <tr key={l.product_id}>
                    <td>
                      {data.products.find((p) => p.id === l.product_id)?.sku ??
                        l.product_id}
                    </td>
                    <td>{l.expected_physical}</td>
                    <td>{l.quantity}</td>
                    <td>
                      {l.delta ??
                        (doc.kind === "COUNT"
                          ? l.quantity - l.expected_physical
                          : l.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {doc.status === "DRAFT" && (
            <DocumentDecision
              key={`${doc.id}:${doc.version}`}
              doc={doc}
              busy={busy}
              run={run}
              onError={setError}
            />
          )}
          {error && <p role="alert">{error}</p>}
          <details>
            <summary>Belge hareketleri ve işlem geçmişi</summary>
            {data.ledger
              .filter((l) => l.reference === doc.id)
              .map((l) => (
                <p key={l.id}>
                  {l.kind} · {l.product_id} · {l.quantity} · {l.reason}
                </p>
              ))}
            {data.audit
              .filter((a) => a.reference === doc.id)
              .map((a) => (
                <p key={a.id}>
                  {new Date(a.created_at).toLocaleString("tr-TR")} · {a.action}{" "}
                  · {a.actor}
                </p>
              ))}
          </details>
        </>
      )}
      <p className="muted">
        Taslak stok değiştirmez. Sayım ana deponun fiziksel adedidir; karantina
        dahil değildir. Stok değişmişse taslağı güncelleyip yeniden kontrol
        edin.
      </p>
    </section>
  );
}
function DocumentEditor({
  data,
  doc,
  busy,
  run,
  onSaved,
}: {
  data: WorkspaceSnapshot;
  doc?: InventoryDocument;
  busy: boolean;
  run: Run;
  onSaved: (id: string) => void;
}) {
  const [kind, setKind] = useState<"COUNT" | "RECEIPT">(doc?.kind ?? "RECEIPT");
  const [lines, setLines] = useState(
    doc?.lines.map((l) => ({
      productId: l.product_id,
      quantity: l.quantity,
    })) ?? [{ productId: data.products[0]?.id ?? "", quantity: 1 }],
  );
  const [error, setError] = useState("");
  const flight = useRef(false);
  return (
    <form
      className="form reason-box"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || flight.current) return;
        flight.current = true;
        setError("");
        const f = new FormData(e.currentTarget);
        const fields = {
          sourceReference: String(f.get("sourceReference")),
          sourceOrderId: String(f.get("sourceOrderId")) || null,
          reason: String(f.get("reason")),
          lines,
        };
        try {
          const r = await run(
            doc
              ? {
                  action: "UPDATE_INVENTORY_DOCUMENT",
                  documentId: doc.id,
                  version: doc.version,
                  ...fields,
                }
              : { action: "CREATE_INVENTORY_DOCUMENT", kind, ...fields },
          );
          if (r) onSaved(r.reference);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          flight.current = false;
        }
      }}
    >
      <fieldset disabled={busy}>
        <legend>
          {doc ? "Taslağı düzenle / stok tabanını yenile" : "Yeni stok belgesi"}
        </legend>
        <label>
          Belge türü
          <select
            value={kind}
            disabled={Boolean(doc)}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="RECEIPT">Mal kabul</option>
            <option value="COUNT">Sayım</option>
          </select>
        </label>
        <label>
          Kaynak belge / referans
          <input
            name="sourceReference"
            required
            minLength={3}
            maxLength={120}
            defaultValue={doc?.source_reference}
            placeholder="İrsaliye veya sayım referansı"
          />
        </label>
        <label>
          İlişkili sipariş (isteğe bağlı)
          <select
            name="sourceOrderId"
            defaultValue={doc?.source_order_id ?? ""}
          >
            <option value="">Yok</option>
            {data.orders
              .filter((o) => o.fulfillment === "FBS")
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.number}
                </option>
              ))}
          </select>
        </label>
        <label>
          Gerekçe
          <input
            name="reason"
            required
            minLength={3}
            maxLength={300}
            defaultValue={doc?.reason}
          />
        </label>
        {lines.map((l, i) => (
          <div className="filterbar" key={i}>
            <select
              aria-label={`Belge ürün ${i + 1}`}
              value={l.productId}
              onChange={(e) =>
                setLines(
                  lines.map((x, j) =>
                    j === i ? { ...x, productId: e.target.value } : x,
                  ),
                )
              }
            >
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} · {p.name}
                </option>
              ))}
            </select>
            <label>
              {kind === "COUNT" ? "Sayılan fiziksel adet" : "Giriş adedi"}
              <input
                aria-label={`Belge adet ${i + 1}`}
                type="number"
                required
                step={1}
                min={kind === "COUNT" ? 0 : 1}
                max={100000}
                value={l.quantity}
                onChange={(e) =>
                  setLines(
                    lines.map((x, j) =>
                      j === i ? { ...x, quantity: Number(e.target.value) } : x,
                    ),
                  )
                }
              />
            </label>
            <button
              type="button"
              disabled={lines.length === 1}
              onClick={() => setLines(lines.filter((_, j) => j !== i))}
            >
              Satırı kaldır
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={lines.length >= 30}
          onClick={() =>
            setLines([
              ...lines,
              {
                productId:
                  data.products.find(
                    (p) => !lines.some((l) => l.productId === p.id),
                  )?.id ?? "",
                quantity: 1,
              },
            ])
          }
        >
          Satır ekle
        </button>
        <button type="submit">
          {doc ? "Taslağı güncelle" : "Taslak oluştur"}
        </button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
function DocumentDecision({
  doc,
  busy,
  run,
  onError,
}: {
  doc: InventoryDocument;
  busy: boolean;
  run: Run;
  onError: (error: string) => void;
}) {
  const [confirm, setConfirm] = useState(false),
    [reason, setReason] = useState("");
  const flight = useRef(false);
  async function send(c: Command) {
    if (busy || flight.current) return;
    flight.current = true;
    onError("");
    try {
      await run(c);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      flight.current = false;
    }
  }
  return (
    <div className="reason-box">
      <label>
        <input
          type="checkbox"
          checked={confirm}
          disabled={busy}
          onChange={(e) => setConfirm(e.target.checked)}
        />{" "}
        Belge satırlarını ve stok etkisini kontrol ettim.
      </label>
      <button
        disabled={busy || !confirm}
        onClick={() =>
          void send({
            action: "CONFIRM_INVENTORY_DOCUMENT",
            documentId: doc.id,
            version: doc.version,
          })
        }
      >
        Belgeyi onayla ve stoğa işle
      </button>
      <label>
        İptal gerekçesi
        <input
          value={reason}
          disabled={busy}
          minLength={3}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <button
        disabled={busy || reason.trim().length < 3}
        onClick={() =>
          void send({
            action: "CANCEL_INVENTORY_DOCUMENT",
            documentId: doc.id,
            version: doc.version,
            reason,
          })
        }
      >
        Taslağı iptal et
      </button>
    </div>
  );
}
