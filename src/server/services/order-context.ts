import { rows, sql, type Tx } from "../db";
import type { Order, OrderLine } from "@/domain/types";
import { DomainError } from "@/domain/permissions";
export async function loadFbsOrder(
  tx: Tx,
  w: string,
  orderId: string,
): Promise<Order> {
  const [o] = await rows<Order>(
    tx,
    sql`SELECT * FROM orders WHERE workspace_id=${w}::uuid AND id=${orderId}`,
  );
  if (!o) throw new DomainError("Sipariş bulunamadı", 404);
  if (o.fulfillment !== "FBS")
    throw new DomainError(
      "FBO yalnızca referans görünümüdür; doğrulanmış API entegrasyonu yok",
    );
  o.lines = await rows<OrderLine>(
    tx,
    sql`SELECT * FROM order_lines WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
  );
  return o;
}

export async function updateOrderStatus(
  tx: Tx,
  w: string,
  orderId: string,
  status: string,
) {
  await tx.execute(
    sql`UPDATE orders SET status=${status} WHERE workspace_id=${w}::uuid AND id=${orderId}`,
  );
}
