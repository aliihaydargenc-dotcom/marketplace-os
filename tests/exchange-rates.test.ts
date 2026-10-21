import { describe, expect, it, vi, afterEach } from "vitest";
import {
  convertMinor,
  parseTcmb,
  quoteAge,
  usableQuote,
  RATE_SCALE,
} from "../src/domain/finance/exchange-rates";
import { latestExchangeQuote } from "../src/server/exchange-rates";
const now = new Date("2026-10-21T10:00:00Z");
const feed = (date = "20.10.2026", rub = "0.50000", unit = "1") =>
  `<Tarih_Date Tarih="${date}"><Currency CurrencyCode="RUB"><Unit>${unit}</Unit><ForexBuying>${rub}</ForexBuying></Currency><Currency CurrencyCode="EUR"><Unit>1</Unit><ForexBuying>50.0000</ForexBuying></Currency></Tarih_Date>`;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("TCMB display conversion", () => {
  it("normalizes quoted units and preserves dated source metadata", () => {
    const q = parseTcmb(feed("20.10.2026", "50.0000", "100"), now);
    expect(q.tryPerUnit).toEqual({
      TRY: RATE_SCALE,
      RUB: RATE_SCALE / 2,
      EUR: 50 * RATE_SCALE,
    });
    expect(q.bulletinDate).toBe("2026-10-20");
    expect(q.method).toBe("ForexBuying");
    expect(quoteAge(q, now)).toBe(1);
    expect(convertMinor(10000, "RUB", "TRY", q)).toBe(5000);
    expect(convertMinor(10000, "RUB", "EUR", q)).toBe(100);
    expect(convertMinor(5000, "TRY", "RUB", q)).toBe(10000);
  });
  it("rounds kopeks/cents symmetrically and never mutates the input", () => {
    const q = parseTcmb(feed(), now),
      before = JSON.stringify(q);
    expect(convertMinor(1, "RUB", "TRY", q)).toBe(1);
    expect(convertMinor(-1, "RUB", "TRY", q)).toBe(-1);
    expect(convertMinor(0, "RUB", "TRY", q)).toBe(0);
    expect(convertMinor(12345, "RUB", "RUB", q)).toBe(12345);
    expect(convertMinor(100, "TRY", "EUR", q)).toBe(2);
    expect(JSON.stringify(q)).toBe(before);
    expect(() => convertMinor(0.5, "RUB", "TRY", q)).toThrow();
    expect(() =>
      convertMinor(Number.MAX_SAFE_INTEGER, "EUR", "TRY", q),
    ).toThrow();
  });
  it("rejects missing, zero, ambiguous, invalid or unsafe input", () => {
    for (const xml of [
      feed().replace('CurrencyCode="RUB"', 'CurrencyCode="USD"'),
      feed("20.10.2026", "0"),
      feed("20.10.2026", "1", "0"),
      feed("31.02.2026"),
      feed().replace(
        "</Tarih_Date>",
        '<Currency CurrencyCode="RUB"><Unit>1</Unit><ForexBuying>1</ForexBuying></Currency></Tarih_Date>',
      ),
      "<!DOCTYPE x>" + feed(),
      "<html>unavailable</html>",
    ])
      expect(() => parseTcmb(xml, now)).toThrow();
  });
  it("does not label old/future bulletins or expired checks as current", () => {
    expect(usableQuote(parseTcmb(feed("18.10.2026"), now), now)).toBe(true);
    expect(() => parseTcmb(feed("13.10.2026"), now)).toThrow();
    expect(() => parseTcmb(feed("22.10.2026"), now)).toThrow();
    const q = parseTcmb(feed(), now);
    expect(usableQuote(q, new Date(now.getTime() + 2 * 3600000 + 1))).toBe(
      false,
    );
    expect(quoteAge(q, new Date("2026-10-20T22:00:00Z"))).toBe(1);
  });
  it("fetches only the official fixed feed and fails closed on network/HTML errors", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const mock = vi
      .fn()
      .mockResolvedValue(new Response(feed(), { status: 200 }));
    vi.stubGlobal("fetch", mock);
    expect((await latestExchangeQuote()).source).toBe("TCMB");
    expect(mock.mock.calls[0][0]).toBe(
      "https://www.tcmb.gov.tr/kurlar/today.xml",
    );
    mock.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    await expect(latestExchangeQuote()).rejects.toThrow();
    mock.mockResolvedValueOnce(new Response("<html>blocked</html>"));
    await expect(latestExchangeQuote()).rejects.toThrow();
  });
});
