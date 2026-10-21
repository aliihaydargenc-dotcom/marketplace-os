import { describe, it, expect } from "vitest";
import { createProductSchema } from "../src/domain/catalog/commands";
import { ozonDemoProducts } from "../src/domain/catalog/ozon-demo";
const fields = {
  action: "CREATE_PRODUCT",
  sku: "new-sku",
  name: "Havlu",
  variant: "Standart",
  barcode: "demo-001",
  category: "Tekstil",
  priceRub: 10000,
  costTry: null,
  threshold: 3,
  active: true,
};
describe("catalog input boundaries", () => {
  it("normalizes SKU and rejects stock injection / invalid values", () => {
    expect(createProductSchema.parse(fields).sku).toBe("NEW-SKU");
    for (const extra of [
      { physical: 10 },
      { priceRub: 0 },
      { barcode: "a b" },
      { sku: "a b" },
      { costTry: -1 },
      { source: { provider: "OZON_PUBLIC" } },
    ])
      expect(
        createProductSchema.safeParse({ ...fields, ...extra }).success,
      ).toBe(false);
  });
  it("keeps six distinct public factual references and explicit demo prices", () => {
    expect(ozonDemoProducts).toHaveLength(6);
    expect(new Set(ozonDemoProducts.map((p) => p.externalId)).size).toBe(6);
    for (const p of ozonDemoProducts) {
      expect(p.url).toMatch(/^https:\/\/www.ozon.ru\/product\//);
      expect(p.demoPriceRub).toBeGreaterThan(0);
      expect(p.demoCostTry).toBeGreaterThan(0);
    }
  });
});
