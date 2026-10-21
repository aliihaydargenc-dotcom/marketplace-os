"use client";
import { useRef, useState } from "react";
import type { Order, Product } from "@/domain/types";
import type { Command } from "@/domain/orders/commands";
import { effectiveUnitCost } from "@/domain/finance/calculations";
export function CostCorrections({
  order,
  products,
  busy,
  run,
}: {
  order: Order;
  products: Product[];
  busy: boolean;
  run: (c: Command) => Promise<unknown>;
}) {
  const [error, setError] = useState("");
  const flight = useRef(false);
  const missing = order.lines.filter(
    (l) => effectiveUnitCost(order, l) === null,
  );
  if (
    !["SHIPPED", "RETURN_PENDING", "RETURNED"].includes(order.status) ||
    !missing.length
  )
    return null;
  return (
    <details className="reason-box">
      <summary>Eksik alış maliyetini tamamla</summary>
      <p className="muted">
        Siparişteki özgün maliyet fotoğrafı değişmez. Tamamlama ayrı kaydedilir;
        tüm satırlar tamamlandığında maliyet bugünün finans hareketi olur. Tutar
        birim başına TL olarak girilir.
      </p>
      {missing.map((l) => (
        <form
          key={l.product_id}
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || flight.current) return;
            flight.current = true;
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              await run({
                action: "CORRECT_MISSING_COST",
                orderId: order.id,
                productId: l.product_id,
                costTry: Math.round(Number(f.get("cost")) * 100),
                reason: String(f.get("reason")),
              });
            } catch (err) {
              setError((err as Error).message);
            } finally {
              flight.current = false;
            }
          }}
        >
          <b>
            {products.find((p) => p.id === l.product_id)?.sku ?? l.product_id} ·{" "}
            {l.quantity} adet
          </b>
          <label>
            Birim alış maliyeti (TL)
            <input
              name="cost"
              type="number"
              min={0}
              max={100000}
              step="0.01"
              required
              disabled={busy}
            />
          </label>
          <label>
            Gerekçe / kaynak
            <input
              name="reason"
              required
              minLength={3}
              maxLength={300}
              disabled={busy}
            />
          </label>
          <button disabled={busy}>Maliyeti tamamla</button>
        </form>
      ))}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
