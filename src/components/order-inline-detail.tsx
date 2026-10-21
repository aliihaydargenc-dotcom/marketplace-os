"use client";

import { ArrowRight, ArrowUpRight, ScanBarcode, X } from "lucide-react";
import type { Order, WorkspaceSnapshot } from "@/domain/types";
import { canOpenSection } from "@/domain/navigation";

export function OrderInlineDetail({
  order,
  data,
  busy,
  onOpen,
  onPrepare,
  onClose,
}: {
  order: Order;
  data: WorkspaceSnapshot;
  busy: boolean;
  onOpen: () => void;
  onPrepare: () => void;
  onClose: () => void;
}) {
  const canPrepare =
    canOpenSection(data.actor.role, "packing") &&
    order.fulfillment === "FBS" &&
    ["NEW", "RESERVED", "PACKING", "READY"].includes(order.status);
  return (
    <section
      className="order-inline-detail"
      aria-label={`${order.number} ürünleri`}
    >
      <div className="inline-products">
        <table aria-label={`${order.number} ürün listesi`}>
          <thead>
            <tr>
              <th>Ürün ({order.lines.length})</th>
              <th>SKU</th>
              <th>Barkod</th>
              <th>Adet</th>
              <th>Paketlenen</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => {
              const product = data.products.find(
                (p) => p.id === line.product_id,
              );
              return (
                <tr key={line.product_id}>
                  <td>
                    <strong>{product?.name ?? "Ürün bulunamadı"}</strong>
                    <small>{product?.variant}</small>
                  </td>
                  <td>{product?.sku ?? "—"}</td>
                  <td className="numeric">{product?.barcode ?? "—"}</td>
                  <td>{line.quantity}</td>
                  <td>
                    <span
                      className={
                        line.packed === line.quantity ? "units-complete" : ""
                      }
                    >
                      {line.packed} / {line.quantity}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="inline-order-actions">
        <button
          className="inline-close icon-button"
          aria-label="Satır ayrıntısını kapat"
          disabled={busy}
          onClick={onClose}
        >
          <X size={15} />
        </button>
        {canPrepare && (
          <button className="primary" disabled={busy} onClick={onPrepare}>
            {order.status === "READY" ? (
              <ArrowRight size={17} />
            ) : (
              <ScanBarcode size={17} />
            )}{" "}
            {order.status === "READY" ? "Sevkiyata geç" : "Hazırlamaya geç"}
          </button>
        )}
        <button className="text-link" disabled={busy} onClick={onOpen}>
          <ArrowUpRight size={17} />
          Detayı aç
        </button>
        {order.fulfillment === "FBO" && <small>FBO · Referans kaydı</small>}
      </div>
    </section>
  );
}
