import { parseTcmb, rateSource } from "@/domain/finance/exchange-rates";
export async function latestExchangeQuote() {
  const response = await fetch(rateSource, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: { Accept: "application/xml, text/xml" },
    redirect: "error",
  });
  if (!response.ok) throw new Error("Kur kaynağına erişilemedi");
  return parseTcmb(await response.text());
}
