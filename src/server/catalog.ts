import { randomUUID } from "node:crypto";
import { rows, sql, type Tx } from "./db";
import type { Actor, Product } from "@/domain/types";
import { DomainError } from "@/domain/permissions";
import type { CatalogCommand } from "@/domain/catalog/commands";
import { ozonDemoProducts, ozonDemoVersion } from "@/domain/catalog/ozon-demo";

export async function importOzonDemo(tx: Tx, actor: Actor) {
  const w = actor.workspaceId,
    ref = ozonDemoVersion;
  const done = await rows(
    tx,
    sql`SELECT id FROM audit_events WHERE workspace_id=${w}::uuid AND reference=${ref} AND action='IMPORT_OZON_DEMO' LIMIT 1`,
  );
  if (done.length) return ref;
  for (const [index, p] of ozonDemoProducts.entries()) {
    const id = `ozon-demo-${p.externalId}`;
    const source = {
      provider: "OZON_PUBLIC",
      externalId: p.externalId,
      url: p.url,
      reviewedAt: "2026-10-21",
      version: ref,
      pricing: "DEMO",
      barcode: "DEMO",
    };
    await tx.execute(
      sql`INSERT INTO products(workspace_id,id,sku,name,variant,barcode,category,cost_try,price_rub,threshold,source) VALUES(${w}::uuid,${id},${`OZ-DEMO-${p.externalId}`},${p.name},${p.variant},${`DEMO-OZ-${p.externalId}`},${p.category},${p.demoCostTry},${p.demoPriceRub},3,${JSON.stringify(source)}::jsonb)`,
    );
    await tx.execute(
      sql`INSERT INTO stock_ledger VALUES(${w}::uuid,${randomUUID()},${id},'MAIN',12,'OPENING',${ref},'Ozon referanslı DEMO paket · miktar kurgusaldır',${actor.userId},now())`,
    );
    if (index % 2 === 0) {
      const oid = `ozon-demo-order-${index / 2 + 1}`;
      await tx.execute(
        sql`INSERT INTO orders VALUES(${w}::uuid,${oid},'ozon-demo',${`DEMO-OZON-00${index / 2 + 1}`},'Kurgusal Ozon örnek alıcısı','FBS','NEW','RUB',now(),null,current_date,485000,1500,25000)`,
      );
    }
    const oid = `ozon-demo-order-${Math.floor(index / 2) + 1}`;
    await tx.execute(
      sql`INSERT INTO order_lines VALUES(${w}::uuid,${oid},${id},1,0,${p.demoPriceRub},${p.demoCostTry})`,
    );
  }
  await tx.execute(
    sql`INSERT INTO audit_events VALUES(${w}::uuid,${randomUUID()},${ref},'IMPORT_OZON_DEMO',${actor.userId},${JSON.stringify({ products: 6, orders: 3, stockPerProduct: 12, pricesAndStock: "DEMO", sourceVersion: ref })}::jsonb,now())`,
  );
  return ref;
}
export async function applyCatalog(
  tx: Tx,
  actor: Actor,
  c: CatalogCommand,
): Promise<string> {
  if (c.action === "IMPORT_OZON_DEMO") return importOzonDemo(tx, actor);
  const w = actor.workspaceId,
    id = c.action === "CREATE_PRODUCT" ? randomUUID() : c.productId;
  const duplicates = await rows(
    tx,
    sql`SELECT id FROM products WHERE workspace_id=${w}::uuid AND id<>${id} AND (lower(sku)=lower(${c.sku}) OR barcode=${c.barcode}) LIMIT 1`,
  );
  if (duplicates.length)
    throw new DomainError(
      "SKU veya barkod bu çalışma alanında zaten kullanılıyor",
    );
  if (c.action === "CREATE_PRODUCT") {
    await tx.execute(
      sql`INSERT INTO products(workspace_id,id,sku,name,variant,barcode,category,cost_try,price_rub,threshold,active) VALUES(${w}::uuid,${id},${c.sku},${c.name},${c.variant},${c.barcode},${c.category},${c.costTry},${c.priceRub},${c.threshold},${c.active})`,
    );
    return id;
  }
  const [old] = await rows<Product>(
    tx,
    sql`SELECT * FROM products WHERE workspace_id=${w}::uuid AND id=${id}`,
  );
  if (!old) throw new DomainError("Ürün bulunamadı", 404);
  if (old.catalog_version !== c.version)
    throw new DomainError(
      "Ürün kartı başka bir işlemde değişti. Yenileyip tekrar açın.",
    );
  const [usage] = await rows<{ used: boolean }>(
    tx,
    sql`SELECT EXISTS(SELECT 1 FROM order_lines WHERE workspace_id=${w}::uuid AND product_id=${id}) used`,
  );
  if (
    usage.used &&
    (old.sku !== c.sku ||
      old.name !== c.name ||
      old.variant !== c.variant ||
      old.barcode !== c.barcode ||
      old.category !== c.category)
  )
    throw new DomainError(
      "Siparişte kullanılan ürünün kimlik alanları değiştirilemez. Yeni bir SKU oluşturun.",
    );
  await tx.execute(
    sql`UPDATE products SET sku=${c.sku},name=${c.name},variant=${c.variant},barcode=${c.barcode},category=${c.category},price_rub=${c.priceRub},cost_try=${c.costTry},threshold=${c.threshold},active=${c.active},catalog_version=catalog_version+1 WHERE workspace_id=${w}::uuid AND id=${id}`,
  );
  return id;
}
