import { it, expect, vi } from "vitest";
import {
  demoProviders,
  readIntegrationSource,
  requireDemo,
} from "../src/server/services/integrations";
it("INT-01 source provider can be replaced without changing snapshot consumers", async () => {
  const source = { orders: [], products: [], financial: [] },
    p = demoProviders(source);
  const orders = vi.spyOn(p.ozon, "orders"),
    products = vi.spyOn(p.ozon, "products"),
    finance = vi.spyOn(p.ozon, "financialTransactions");
  expect(await readIntegrationSource(source, () => p)).toEqual(source);
  expect(orders).toHaveBeenCalledOnce();
  expect(products).toHaveBeenCalledOnce();
  expect(finance).toHaveBeenCalledOnce();
});
it("INT-01 refuses live providers before app transaction", () => {
  const p = demoProviders();
  Object.defineProperty(p.ozon, "mode", { value: "live" });
  expect(() => requireDemo(p)).toThrow("Canlı sağlayıcı");
});
