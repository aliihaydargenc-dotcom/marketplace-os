import { describe, expect, it } from "vitest";
import { findOzonObservation, ozonMarketObservations } from "../src/domain/catalog/ozon-market-snapshot";
describe("verified Ozon public product snapshot", () => {
  it("has unique, source-linked real Ozon product identities", () => {
    expect(ozonMarketObservations).toHaveLength(10);
    expect(new Set(ozonMarketObservations.map((p) => p.id)).size).toBe(10);
    expect(ozonMarketObservations.every((p) => p.url.startsWith("https://www.ozon.ru/product/") && p.url.includes(p.id) && p.observedOn === "2026-10-21")).toBe(true);
  });
  it("does not fabricate unobtainable public prices", () => {
    const missing = ozonMarketObservations.filter((p) => p.otherBankPriceRub === null);
    expect(missing.map((p) => p.id).sort()).toEqual(["1322337545", "1416873033"]);
  });
  it("separates real observed bank prices from other bank conditions", () => {
    const listed = ozonMarketObservations.filter((p) => p.otherBankPriceRub !== null);
    expect(listed).toHaveLength(8);
    for (const p of listed) {
      expect(p.bankPriceRub).not.toBeNull();
      expect(p.otherBankPriceRub!).toBeGreaterThanOrEqual(p.bankPriceRub!);
    }
    expect(findOzonObservation("3867869659")?.otherBankPriceRub).toBe(971);
  });
});
