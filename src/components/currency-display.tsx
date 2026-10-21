"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  convertMinor,
  quoteAge,
  rateSource,
  usableQuote,
  RATE_SCALE,
  type ExchangeQuote,
  type QuoteCurrency,
} from "@/domain/finance/exchange-rates";
import "./currency-display.css";
const CurrencyContext = createContext<{
  quote: ExchangeQuote | null;
  target: QuoteCurrency | "OFF";
}>({ quote: null, target: "OFF" });
const ControlsContext = createContext<ReactNode>(null);
const format = (amount: number, currency: string) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
async function fetchQuote(signal?: AbortSignal): Promise<ExchangeQuote> {
  const response = await fetch("/api/exchange-rates", {
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
      : AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error("TCMB kuru alınamadı; karşılıklar gösterilmiyor.");
  const value: ExchangeQuote = await response.json();
  if (!usableQuote(value))
    throw new Error(
      "Kurun geçerlilik süresi doldu; karşılıklar gösterilmiyor.",
    );
  return value;
}
export function CurrencyDisplayProvider({ children }: { children: ReactNode }) {
  const [quote, setQuote] = useState<ExchangeQuote | null>(null);
  const [target, setTarget] = useState<QuoteCurrency | "OFF">("TRY");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const load = useCallback((signal?: AbortSignal) => {
    const version = ++requestVersion.current;
    return fetchQuote(signal)
      .then((value) => {
        if (signal?.aborted || version !== requestVersion.current) return;
        setQuote(value);
        setError("");
      })
      .catch(() => {
        if (signal?.aborted || version !== requestVersion.current) return;
        setQuote(null);
        setError(
          "TCMB kuru alınamadı; karşılıklar gösterilmiyor. Tekrar kontrol edin.",
        );
      })
      .finally(() => {
        if (!signal?.aborted && version === requestVersion.current)
          setLoading(false);
      });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState === "visible") {
        setLoading(true);
        void load(controller.signal);
      }
    };
    void load(controller.signal);
    const timer = setInterval(refresh, 15 * 60 * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();

      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);
  const valid = quote && usableQuote(quote) ? quote : null;
  const controls = (
    <section className="currency-display-bar" aria-label="Döviz karşılığı">
      <div className="currency-display-choice">
        <label htmlFor="currency-equivalent">Tutarların altında</label>
        <select
          id="currency-equivalent"
          value={target}
          onChange={(e) => setTarget(e.target.value as QuoteCurrency | "OFF")}
        >
          <option value="TRY">Türk lirası karşılığını göster</option>
          <option value="EUR">Euro karşılığını göster</option>
          <option value="RUB">Ruble karşılığını göster</option>
          <option value="OFF">Yalnız özgün tutarı göster</option>
        </select>
      </div>
      <div className="currency-display-source" aria-live="polite">
        {valid ? (
          <>
            <a href={rateSource} target="_blank" rel="noreferrer">
              TCMB · döviz alış
            </a>
            <span>
              Bülten: {valid.bulletinDate.split("-").reverse().join(".")}{" "}
              {quoteAge(valid) > 0 ? "· Önceki tarihli bülten" : ""}
            </span>
            <span>
              1 RUB ={" "}
              {(valid.tryPerUnit.RUB / RATE_SCALE).toLocaleString("tr-TR", {
                maximumFractionDigits: 8,
              })}{" "}
              TL · 1 EUR ={" "}
              {(valid.tryPerUnit.EUR / RATE_SCALE).toLocaleString("tr-TR", {
                maximumFractionDigits: 8,
              })}{" "}
              TL
            </span>
            <small>
              Son kontrol:{" "}
              {new Date(valid.checkedAt).toLocaleTimeString("tr-TR", {
                timeZone: "Europe/Istanbul",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · Türkiye saati
            </small>
          </>
        ) : (
          <span role={error ? "alert" : "status"}>
            {loading
              ? "TCMB kuru kontrol ediliyor…"
              : error || "Kur geçerli değil; karşılıklar gösterilmiyor."}
          </span>
        )}
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setLoading(true);
          void load();
        }}
      >
        {loading ? "Kontrol ediliyor…" : "Kuru kontrol et"}
      </button>
      <p>
        Özgün tutarlar değişmez. ≈ işaretli karşılıklar son bültenle yaklaşık
        değerlemedir; işlem kuru ve rapor çıktıları ayrıdır.
      </p>
    </section>
  );
  return (
    <CurrencyContext.Provider value={{ quote: valid, target }}>
      <ControlsContext.Provider value={controls}>
        {children}
      </ControlsContext.Provider>
    </CurrencyContext.Provider>
  );
}
export function CurrencyDisplayControls() {
  return useContext(ControlsContext);
}
export function QuotedAmount({
  amount,
  currency = "RUB",
}: {
  amount: number;
  currency?: string;
}) {
  const { quote, target } = useContext(CurrencyContext);
  let converted: number | null = null;
  if (
    target !== "OFF" &&
    target !== currency &&
    quote &&
    usableQuote(quote) &&
    ["TRY", "RUB", "EUR"].includes(currency)
  ) {
    try {
      converted = convertMinor(
        amount,
        currency as QuoteCurrency,
        target,
        quote,
      );
    } catch {
      /* Original amount stays readable if conversion is unavailable. */
    }
  }
  return (
    <span className="quoted-amount">
      <span>{format(amount, currency)}</span>
      {converted !== null && target !== "OFF" && (
        <span
          className="quoted-equivalent"
          title={`TCMB döviz alış · ${quote!.bulletinDate} · güncel değerleme, işlem kuru değil`}
        >
          ≈ {format(converted, target)}
        </span>
      )}
    </span>
  );
}
export const displayMoney = (amount: number, currency = "RUB") => (
  <QuotedAmount amount={amount} currency={currency} />
);
