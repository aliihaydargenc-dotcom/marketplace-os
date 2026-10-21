import { randomUUID } from "node:crypto";
import {
  DemoOzonAdapter,
  DemoParasutAdapter,
  type OzonAdapter,
  type ParasutAdapter,
  type IntegrationReceipt,
} from "@/domain/integrations/adapters";
import type { Order, Product, FinancialEntry } from "@/domain/types";
import { DomainError } from "@/domain/permissions";
import { sql, type Tx } from "../db";
export interface IntegrationSource {
  orders: Order[];
  products: Product[];
  financial: FinancialEntry[];
}
export interface IntegrationProviders {
  ozon: OzonAdapter;
  parasut: ParasutAdapter;
}
export function demoProviders(
  source: IntegrationSource = { orders: [], products: [], financial: [] },
): IntegrationProviders {
  return {
    ozon: new DemoOzonAdapter(source),
    parasut: new DemoParasutAdapter(),
  };
}
export function requireDemo(providers: IntegrationProviders) {
  if (providers.ozon.mode !== "demo" || providers.parasut.mode !== "demo")
    throw new DomainError("Canlı sağlayıcı bu demo sürümünde kullanılamaz");
}
export async function readIntegrationSource(
  source: IntegrationSource,
  factory = demoProviders,
) {
  const p = factory(source);
  requireDemo(p);
  const [orders, products, financial] = await Promise.all([
    p.ozon.orders(),
    p.ozon.products(),
    p.ozon.financialTransactions(),
  ]);
  return { orders, products, financial };
}
export async function recordIntegration(
  tx: Tx,
  w: string,
  orderId: string,
  provider: "OZON" | "PARASUT",
  operation: "DEMO_SHIPPED" | "SALES_INVOICE",
  reference: string,
  receipt: IntegrationReceipt,
) {
  if (
    receipt.mode !== "demo" ||
    receipt.sent !== false ||
    receipt.externalId !== null
  )
    throw new DomainError(
      "Demo sağlayıcı dış gönderim yapmış gibi yanıt veremez",
    );
  await tx.execute(
    sql`INSERT INTO integration_events(workspace_id,id,order_id,provider,operation,reference,mode,sent) VALUES(${w}::uuid,${randomUUID()},${orderId},${provider},${operation},${reference},'demo',false) ON CONFLICT(workspace_id,provider,operation,reference) DO NOTHING`,
  );
}
