import { describe, expect, it } from "vitest";
import {
  findOzonObservation,
  ozonMarketObservations,
} from "../src/domain/catalog/ozon-market-snapshot";

describe("verified Ozon public product snapshot", () => {
  it("has unique, source-linked real Ozon product identities", () => {
    expect(ozonMarketObservations).toHaveLength(10);
    expect(
      new Set(ozonMarketObservations.map((product) => product.id)).size,
    ).toBe(10);
    expect(
      ozonMarketObservations.every(
        (product) =>
          product.url.startsWith("https://www.ozon.ru/product/") &&
          product.url.includes(product.id) &&
          product.observedOn === "2026-10-21",
      ),
    ).toBe(true);
  });

  it("does not fabricate unobtainable public prices", () => {
    const missing = ozonMarketObservations.filter(
      (product) => product.otherBankPriceRub === null,
    );
    expect(missing.map((product) => product.id).sort()).toEqual([
      "1322337545",
      "1416873033",
    ]);
  });

  it("separates bank promotions from other payment conditions", () => {
    const listed = ozonMarketObservations.filter(
      (product) => product.otherBankPriceRub !== null,
    );
    expect(listed).toHaveLength(8);
    for (const product of listed) {
      expect(product.bankPriceRub).not.toBeNull();
      expect(product.otherBankPriceRub!).toBeGreaterThanOrEqual(
        product.bankPriceRub!,
      );
    }
    expect(findOzonObservation("3867869659")?.otherBankPriceRub).toBe(971);
  });
});
