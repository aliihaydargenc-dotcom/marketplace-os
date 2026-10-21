"use client";
import { useState } from "react";
import type { Product, WorkspaceSnapshot } from "@/domain/types";
import type { Command } from "@/domain/orders/commands";
import "./catalog-tools.css";
type Run = (command: Command) => Promise<{ reference: string } | undefined>;
export function ProductEditor({
  product,
  locked = false,
  busy,
  run,
  onSaved,
  onCancel,
}: {
  product?: Product;
  locked?: boolean;
  busy: boolean;
  run: Run;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}) {
  const [error, setError] = useState("");
  return (
    <form
      className="catalog-editor form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setError("");
        const f = new FormData(e.currentTarget);
        const fields = {
          sku: locked ? product!.sku : String(f.get("sku")),
          name: locked ? product!.name : String(f.get("name")),
          variant: locked ? product!.variant : String(f.get("variant")),
          barcode: locked ? product!.barcode : String(f.get("barcode")),
          category: locked ? product!.category : String(f.get("category")),
          priceRub: Math.round(Number(f.get("price")) * 100),
          costTry:
            f.get("cost") === ""
              ? null
              : Math.round(Number(f.get("cost")) * 100),
          threshold: Number(f.get("threshold")),
          active: f.get("active") === "on",
        };
        try {
          const result = await run(
            product
              ? {
                  action: "UPDATE_CATALOG",
                  productId: product.id,
                  version: product.catalog_version ?? 0,
                  ...fields,
                }
              : { action: "CREATE_PRODUCT", ...fields },
          );
          if (result) onSaved?.(result.reference);
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <div className="catalog-editor-heading">
        <h3>{product ? "Ürün kartını düzenle" : "Yeni ürün / SKU"}</h3>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy}>
            Vazgeç
          </button>
        )}
      </div>
      {locked && (
        <p className="catalog-hint">
          Bu ürün siparişte kullanılmış. Geçmiş kayıtları korumak için kimlik
          alanları kilitli; farklı ürün için yeni SKU açın.
        </p>
      )}
      {error && (
        <p role="alert" className="danger-text">
          {error}
        </p>
      )}
      <fieldset disabled={busy} className="catalog-fields">
        <label>
          SKU
          <input
            name="sku"
            required
            minLength={2}
            maxLength={60}
            pattern="[A-Za-z0-9._\-]+"
            defaultValue={product?.sku}
            disabled={locked}
            autoFocus={!product}
          />
        </label>
        <label>
          Ürün adı
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={product?.name}
            disabled={locked}
          />
        </label>
        <label>
          Varyant / Ölçü
          <input
            name="variant"
            required
            maxLength={100}
            defaultValue={product?.variant ?? "Standart"}
            disabled={locked}
          />
        </label>
        <label>
          Barkod
          <input
            name="barcode"
            required
            minLength={3}
            maxLength={80}
            defaultValue={product?.barcode}
            disabled={locked}
          />
        </label>
        <label>
          Kategori
          <input
            name="category"
            required
            minLength={2}
            maxLength={80}
            defaultValue={product?.category}
            disabled={locked}
          />
        </label>
        <label>
          Satış fiyatı (RUB)
          <input
            name="price"
            type="number"
            required
            min="0.01"
            max="100000"
            step="0.01"
            defaultValue={product ? product.price_rub / 100 : ""}
          />
        </label>
        <label>
          Alış maliyeti (TL · boş = bilinmiyor)
          <input
            name="cost"
            type="number"
            min="0"
            max="100000"
            step="0.01"
            defaultValue={
              product?.cost_try == null ? "" : product.cost_try / 100
            }
          />
        </label>
        <label>
          Kritik stok eşiği
          <input
            name="threshold"
            type="number"
            required
            min="0"
            max="100000"
            step="1"
            defaultValue={product?.threshold ?? 3}
          />
        </label>
        <label className="catalog-active">
          <input
            type="checkbox"
            name="active"
            defaultChecked={product?.active !== false}
          />
          Aktif · yeni siparişe eklenebilir
        </label>
      </fieldset>
      <p className="catalog-hint">
        Kart kaydı stok oluşturmaz. Stok girişini referanslı hareketle yapın.
        Fiyat ve maliyet değişikliği önceki siparişin kayıtlı tutarlarını
        değiştirmez. Pasif ürünün mevcut siparişleri işlenebilir.
      </p>
      <button className="primary" disabled={busy}>
        {busy
          ? "Kaydediliyor…"
          : product
            ? "Ürün kartını kaydet"
            : "Sıfır stokla SKU oluştur"}
      </button>
    </form>
  );
}
export function CatalogTools({
  data,
  busy,
  run,
  onCreated,
}: {
  data: WorkspaceSnapshot;
  busy: boolean;
  run: Run;
  onCreated: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false),
    [error, setError] = useState("");
  const count = data.products.filter(
    (p) => p.source?.provider === "OZON_PUBLIC",
  ).length;
  return (
    <section className="catalog-tools" aria-label="Ürün kataloğu yönetimi">
      <div className="catalog-tools-row">
        <div>
          <strong>Ürün kataloğu</strong>
          <p>
            {count} Ozon referanslı örnek ürün ·{" "}
            {data.products.filter((p) => p.active === false).length} pasif SKU
          </p>
        </div>
        {data.actor.role === "ADMIN" && (
          <div className="catalog-actions">
            <button
              disabled={busy || count >= 6}
              onClick={async () => {
                setError("");
                try {
                  await run({ action: "IMPORT_OZON_DEMO" });
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {count >= 6
                ? "Ozon örnek paketi eklendi"
                : "Ozon örnek paketini ekle"}
            </button>
            <button
              className="primary"
              disabled={busy || creating}
              onClick={() => setCreating(true)}
            >
              Yeni ürün / SKU
            </button>
          </div>
        )}
      </div>
      <p className="catalog-hint">
        Ozon referansı yalnız açık ürün bilgilerini belirtir. Fiyatlar, alış
        maliyetleri, DEMO barkodlar, stoklar ve üç örnek sipariş kurgusaldır;
        canlı satış aktarımı değildir.
      </p>
      {error && (
        <p role="alert" className="danger-text">
          {error}
        </p>
      )}
      {creating && (
        <ProductEditor
          busy={busy}
          run={run}
          onCancel={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            onCreated(id);
          }}
        />
      )}
    </section>
  );
}
export function ProductSource({ product }: { product: Product }) {
  const source = product.source;
  if (
    source?.provider !== "OZON_PUBLIC" ||
    !source.url?.startsWith("https://www.ozon.ru/product/")
  )
    return null;
  return (
    <div className="catalog-source">
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        Ozon ürün referansı ↗
      </a>
      <span>Kontrol: {source.reviewedAt} · fiyat / stok / barkod DEMO</span>
    </div>
  );
}
