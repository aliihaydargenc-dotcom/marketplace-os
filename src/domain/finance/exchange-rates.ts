export const RATE_SCALE = 100_000_000;
export type QuoteCurrency = "TRY" | "RUB" | "EUR";
export type ExchangeQuote = {
  source: "TCMB";
  method: "ForexBuying";
  bulletinDate: string;
  checkedAt: string;
  tryPerUnit: Record<QuoteCurrency, number>;
};
export const rateSource = "https://www.tcmb.gov.tr/kurlar/today.xml";
export function turkeyDay(now: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function quoteAge(quote: ExchangeQuote, now = new Date()) {
  return Math.round(
    (Date.parse(turkeyDay(now)) - Date.parse(quote.bulletinDate)) / 86400000,
  );
}
export function usableQuote(quote: ExchangeQuote, now = new Date()) {
  const age = quoteAge(quote, now);
  const elapsed = now.getTime() - Date.parse(quote.checkedAt);
  return (
    Number.isFinite(age) &&
    age >= 0 &&
    age <= 7 &&
    elapsed >= -60000 &&
    elapsed <= 2 * 3600000
  );
}
// Only the fixed, public TCMB feed is parsed. No DTD/entity expansion or arbitrary URL.
export function parseTcmb(xml: string, now = new Date()): ExchangeQuote {
  if (xml.length > 100000 || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("Geçersiz kur kaynağı");
  const date = xml.match(
    /<Tarih_Date\b[^>]*\bTarih="(\d{2})\.(\d{2})\.(\d{4})"/,
  );
  if (!date) throw new Error("Kur bülteni tarihi okunamadı");
  const bulletinDate = `${date[3]}-${date[2]}-${date[1]}`;
  const parsed = new Date(bulletinDate);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== bulletinDate
  )
    throw new Error("Geçersiz kur tarihi");
  const tryPerUnit: ExchangeQuote["tryPerUnit"] = {
    TRY: RATE_SCALE,
    RUB: 0,
    EUR: 0,
  };
  for (const currency of ["RUB", "EUR"] as const) {
    const blocks = [
      ...xml.matchAll(/<Currency\b([^>]*)>([\s\S]*?)<\/Currency>/g),
    ].filter((m) => new RegExp(`\\bCurrencyCode="${currency}"`).test(m[1]));
    if (blocks.length !== 1)
      throw new Error("Kur para birimi eksik veya tekrarlı");
    const unit = Number(blocks[0][2].match(/<Unit>(\d+)<\/Unit>/)?.[1]);
    const raw = blocks[0][2].match(
      /<ForexBuying>(\d+(?:\.\d{1,8})?)<\/ForexBuying>/,
    )?.[1];
    if (!raw || !Number.isSafeInteger(unit) || unit < 1 || unit > 10000)
      throw new Error("Kur değeri okunamadı");
    const rate = Math.round((Number(raw) * RATE_SCALE) / unit);
    if (!Number.isSafeInteger(rate) || rate <= 0 || rate > 1000000 * RATE_SCALE)
      throw new Error("Geçersiz kur değeri");
    tryPerUnit[currency] = rate;
  }
  const quote: ExchangeQuote = {
    source: "TCMB",
    method: "ForexBuying",
    bulletinDate,
    checkedAt: now.toISOString(),
    tryPerUnit,
  };
  if (!usableQuote(quote, now))
    throw new Error("Kur bülteni eski veya ileri tarihli");
  return quote;
}
// Minor units in and out; ties away from zero, including refunds. No floating-point multiplication.
export function convertMinor(
  amount: number,
  from: QuoteCurrency,
  to: QuoteCurrency,
  quote: ExchangeQuote,
): number {
  if (!Number.isSafeInteger(amount))
    throw new Error("Tutar güvenli tamsayı olmalı");
  const a = quote.tryPerUnit[from],
    b = quote.tryPerUnit[to];
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a <= 0 || b <= 0)
    throw new Error("Kur değeri eksik");
  const numerator = BigInt(amount) * BigInt(a),
    denominator = BigInt(b);
  const positive = numerator < 0n ? -numerator : numerator;
  const rounded = (positive + denominator / 2n) / denominator;
  const result = Number(numerator < 0n ? -rounded : rounded);
  if (!Number.isSafeInteger(result)) throw new Error("Dönüşüm sınırı aşıldı");
  return result;
}
