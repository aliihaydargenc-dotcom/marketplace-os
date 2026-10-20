import { rows, sql, type Tx } from "@/server/db";
import { DomainError } from "../permissions";
export async function balance(tx: Tx, w: string, productId: string) {
  const [result] = await rows<{ physical: number; reserved: number }>(
    tx,
    sql`SELECT (SELECT COALESCE(SUM(quantity),0)::int FROM stock_ledger WHERE workspace_id=${w}::uuid AND product_id=${productId} AND warehouse_id='MAIN') physical,(SELECT COALESCE(SUM(quantity),0)::int FROM reservations WHERE workspace_id=${w}::uuid AND product_id=${productId} AND active) reserved`,
  );
  return { ...result, available: result.physical - result.reserved };
}
export async function requireAvailable(
  tx: Tx,
  w: string,
  productId: string,
  quantity: number,
) {
  const b = await balance(tx, w, productId);
  if (b.available < quantity)
    throw new DomainError(
      `Yetersiz kullanılabilir stok: ${productId} (${b.available} adet)`,
    );
  return b;
}
