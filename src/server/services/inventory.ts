import { randomUUID } from "node:crypto";
import { rows, sql, type Tx } from "../db";
import type { Actor } from "@/domain/types";
import { DomainError } from "@/domain/permissions";
import type { Command } from "@/domain/orders/commands";
import { balance } from "@/domain/inventory/stock";
export async function movement(
  tx: Tx,
  a: Actor,
  p: string,
  warehouse: string,
  q: number,
  kind: string,
  reference: string,
  reason: string,
) {
  await tx.execute(
    sql`INSERT INTO stock_ledger VALUES(${a.workspaceId}::uuid,${randomUUID()},${p},${warehouse},${q},${kind},${reference},${reason},${a.userId},now())`,
  );
}

export async function applyInventory(
  tx: Tx,
  a: Actor,
  c: Extract<Command, { action: "ADJUST" | "PRODUCT" }>,
): Promise<string> {
  const w = a.workspaceId;
  if (c.action === "ADJUST") {
    const [p] = await rows(
      tx,
      sql`SELECT id FROM products WHERE workspace_id=${w}::uuid AND id=${c.productId}`,
    );
    if (!p) throw new DomainError("Ürün bulunamadı", 404);
    const b = await balance(tx, w, c.productId);
    if (b.available + c.quantity < 0)
      throw new DomainError(
        "Düzeltme rezerve stoğu veya fiziksel bakiyeyi negatife düşüremez",
      );
    const ref = randomUUID();
    await movement(
      tx,
      a,
      c.productId,
      "MAIN",
      c.quantity,
      "ADJUSTMENT",
      ref,
      c.reason,
    );
    return ref;
  }
  if (c.action === "PRODUCT") {
    const p = await rows(
      tx,
      sql`UPDATE products SET cost_try=${c.costTry},threshold=${c.threshold},catalog_version=catalog_version+1 WHERE workspace_id=${w}::uuid AND id=${c.productId} RETURNING id`,
    );
    if (!p.length) throw new DomainError("Ürün bulunamadı", 404);
    return c.productId;
  }
  throw new DomainError("Desteklenmeyen stok işlemi");
}
