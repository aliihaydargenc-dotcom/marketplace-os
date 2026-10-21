"use client";

import { useState } from "react";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";
import {
  ozonMarketObservations,
  ozonMarketObservedOn,
} from "@/domain/catalog/ozon-market-snapshot";
import "./ozon-market-panel.css";

const rub = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

export function OzonMarketPanel({
  compact = false,
  onViewAll,
}: {
  compact?: boolean;
  onViewAll?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [onlyPriced, setOnlyPriced] = useState(false);
  const priced = ozonMarketObservations.filter(
    (product) => product.otherBankPriceRub !== null,
  );
  const match = search.trim().toLocaleLowerCase("tr");
  const rows = compact
    ? priced.slice(0, 4)
    : ozonMarketObservations.filter(
        (product) =>
          (!onlyPriced || product.otherBankPriceRub !== null) &&
          [
            product.title,
            product.details,
            product.id,
            product.category,
          ]
            .join(" ")
            .toLocaleLowerCase("tr")
            .includes(match),
      );

  return (
    <section
      className="ozon-market"
      aria-label="Gerçek Ozon ürün ve fiyat gözlemleri"
    >
      <header className="ozon-market-head">
        <div>
          <span>OZON.RU · KAMUYA AÇIK ÜRÜNLER</span>
          <h2>Ozon Pazar Verileri</h2>
        </div>
        <small>21.10.2026 gözlemi</small>
      </header>
      <div className="ozon-market-meta">
        <span>
          <b>{ozonMarketObservations.length}</b> gerçek ürün
        </span>
        <span>
          <b>{priced.length}</b> fiyatı doğrulanmış ürün
        </span>
        <span>Kaynak: Ozon ürün sayfaları</span>
      </div>
      {!compact && (
        <div className="ozon-market-controls">
          <label>
            <Search size={16} />
            <input
              aria-label="Ozon ürünlerinde ara"
              type="search"
              placeholder="Ürün / Ozon ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={onlyPriced}
              onChange={(event) => setOnlyPriced(event.target.checked)}
            />
            Fiyatı doğrulananlar
          </label>
        </div>
      )}
      <div className="ozon-market-scroll">
        <table>
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Banka koşullu</th>
              <th>Diğer bankalar</th>
              <th>Kaynak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.title}</strong>
                  <small>
                    {product.details} · ID {product.id}
                  </small>
                </td>
                <td className="ozon-num">
                  {product.bankPriceRub === null
                    ? "—"
                    : rub(product.bankPriceRub)}
                </td>
                <td className="ozon-num">
                  {product.otherBankPriceRub === null ? (
                    "Doğrulanamadı"
                  ) : (
                    <strong>{rub(product.otherBankPriceRub)}</strong>
                  )}
                </td>
                <td>
                  <a
                    href={product.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Ozon'da aç <ArrowUpRight size={14} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="ozon-market-empty">Eşleşen ürün bulunamadı.</p>
      )}
      <footer className="ozon-market-foot">
        <span>
          {ozonMarketObservedOn} tarihinde görüldü; anlık fiyat, satıcı stoğu
          veya gerçekleşen satış değildir.
        </span>
        {compact && onViewAll && (
          <button type="button" onClick={onViewAll}>
            Tüm ürünler <ArrowRight size={15} />
          </button>
        )}
      </footer>
    </section>
  );
}
