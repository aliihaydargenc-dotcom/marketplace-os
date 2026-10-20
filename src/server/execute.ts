import { createHash, randomUUID } from "node:crypto";
import { rows, sql, transaction, type Tx } from "./db";
import type { Actor, Order, OrderLine } from "@/domain/types";
import { authorize, DomainError } from "@/domain/permissions";
import { commandSchema, type Command } from "@/domain/orders/commands";
import { requireAvailable, balance } from "@/domain/inventory/stock";
import { costInOrderCurrency } from "@/domain/finance/calculations";
import { seed } from "./seed";
export async function execute(
  actor: Actor,
  input: Command,
  key: string,
  generation: number,
) {
  const command = commandSchema.parse(input);
  authorize(actor.role, command.action);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex");
  return transaction(actor.workspaceId, async (tx) => {
    const w = actor.workspaceId;
    // Re-read user permissions inside the same lock as the mutation; stale sessions cannot retain rights.
    const [user] = await rows<{ role: Actor["role"]; active: boolean }>(
      tx,
      sql`SELECT role,active FROM users WHERE workspace_id=${w}::uuid AND id=${actor.userId}`,
    );
    if (!user?.active) throw new DomainError("Kullanıcı aktif değil", 403);
    authorize(user.role, command.action);
    const [workspace] = await rows<{ generation: number }>(
      tx,
      sql`SELECT generation FROM workspaces WHERE id=${w}::uuid`,
    );
    if (workspace.generation !== generation)
      throw new DomainError("Demo sıfırlandı; sayfayı yenileyin");
    const [receipt] = await rows<{
      fingerprint: string;
      result: { reference: string };
    }>(
      tx,
      sql`SELECT fingerprint,result FROM command_receipts WHERE workspace_id=${w}::uuid AND key=${key}`,
    );
    if (receipt) {
      if (receipt.fingerprint !== fingerprint)
        throw new DomainError("İşlem anahtarı farklı istekle kullanılmış");
      return receipt.result;
    }
    const reference = await apply(tx, { ...actor, role: user.role }, command);
    const result = { reference };
    await tx.execute(
      sql`INSERT INTO command_receipts VALUES(${w}::uuid,${key},${fingerprint},${JSON.stringify(result)}::jsonb)`,
    );
    await tx.execute(
      sql`INSERT INTO audit_events VALUES(${w}::uuid,${randomUUID()},${reference},${command.action},${actor.userId},${JSON.stringify(command)}::jsonb,now())`,
    );
    return result;
  });
}
async function movement(
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
async function finance(
  tx: Tx,
  a: Actor,
  o: Order,
  kind: string,
  amount: number,
) {
  await tx.execute(
    sql`INSERT INTO financial_entries VALUES(${a.workspaceId}::uuid,${o.id},${randomUUID()},${kind},${amount},${o.currency},now()) ON CONFLICT(workspace_id,order_id,kind) DO NOTHING`,
  );
}
async function draft(tx: Tx, w: string, orderId: string) {
  await tx.execute(
    sql`INSERT INTO invoices(workspace_id,order_id,id,status,created_at) VALUES(${w}::uuid,${orderId},${randomUUID()},'DRAFT',now()) ON CONFLICT(workspace_id,order_id) DO NOTHING`,
  );
}
async function apply(tx: Tx, a: Actor, c: Command): Promise<string> {
  const w = a.workspaceId;
  if (c.action === "CREATE_ORDER") {
    if (new Set(c.lines.map((l) => l.productId)).size !== c.lines.length)
      throw new DomainError("Aynı SKU tek satırda birleştirilmeli");
    const id = randomUUID(),
      number = `DEMO-${id.slice(0, 8).toUpperCase()}`;
    await tx.execute(
      sql`INSERT INTO orders VALUES(${w}::uuid,${id},'ozon-demo',${number},${c.customer},'FBS','NEW',${c.currency},now(),null,${c.fxDate}::date,${c.fxRate},${c.commissionBps},${c.logistics})`,
    );
    for (const l of c.lines) {
      const [p] = await rows<{ price_rub: number; cost_try: number | null }>(
        tx,
        sql`SELECT price_rub,cost_try FROM products WHERE workspace_id=${w}::uuid AND id=${l.productId}`,
      );
      if (!p) throw new DomainError("Ürün bulunamadı", 404);
      const price =
        c.currency === "RUB"
          ? p.price_rub
          : Math.round((p.price_rub * c.fxRate) / 1000000);
      await tx.execute(
        sql`INSERT INTO order_lines VALUES(${w}::uuid,${id},${l.productId},${l.quantity},0,${price},${p.cost_try})`,
      );
    }
    return id;
  }
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
      sql`UPDATE products SET cost_try=${c.costTry},threshold=${c.threshold} WHERE workspace_id=${w}::uuid AND id=${c.productId} RETURNING id`,
    );
    if (!p.length) throw new DomainError("Ürün bulunamadı", 404);
    return c.productId;
  }
  if (c.action === "SETTINGS") {
    await tx.execute(
      sql`UPDATE workspaces SET name=${c.name},settings=settings || ${JSON.stringify({ autoDraft: c.autoDraft })}::jsonb WHERE id=${w}::uuid`,
    );
    return w;
  }
  if (c.action === "USER") {
    if (c.userId === a.userId && (c.role !== "ADMIN" || !c.active))
      throw new DomainError("Kendi yönetici erişiminizi kapatamazsınız");
    // Built-in demo roles remain fixed; additional users can be managed independently.
    if (
      ["admin", "warehouse", "accountant"].includes(c.userId) &&
      c.role !==
        (
          {
            admin: "ADMIN",
            warehouse: "WAREHOUSE",
            accountant: "ACCOUNTANT",
          } as Record<string, string>
        )[c.userId]
    )
      throw new DomainError("Yerleşik demo hesabının rolü değiştirilemez");
    await tx.execute(
      sql`INSERT INTO users VALUES(${w}::uuid,${c.userId},${c.name},${c.role},${c.active}) ON CONFLICT(workspace_id,id) DO UPDATE SET name=EXCLUDED.name,role=EXCLUDED.role,active=EXCLUDED.active`,
    );
    return c.userId;
  }
  if (c.action === "RESET") {
    for (const t of [
      "command_receipts",
      "audit_events",
      "financial_entries",
      "returns",
      "invoices",
      "shipments",
      "reservations",
      "stock_ledger",
      "order_lines",
      "orders",
      "products",
      "warehouses",
      "stores",
    ])
      await tx.execute(
        sql`DELETE FROM ${sql.identifier(t)} WHERE workspace_id=${w}::uuid`,
      );
    await tx.execute(
      sql`UPDATE workspaces SET generation=generation+1 WHERE id=${w}::uuid`,
    );
    await seed(tx, w);
    return w;
  }
  const [o] = await rows<Order>(
    tx,
    sql`SELECT * FROM orders WHERE workspace_id=${w}::uuid AND id=${c.orderId}`,
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
  const update = async (status: string) =>
    tx.execute(
      sql`UPDATE orders SET status=${status} WHERE workspace_id=${w}::uuid AND id=${o.id}`,
    );
  if (c.action === "RESERVE") {
    if (["RESERVED", "PACKING", "READY"].includes(o.status)) return o.id;
    if (o.status !== "NEW")
      throw new DomainError("Bu durumdan rezervasyon yapılamaz");
    for (const l of o.lines) {
      await requireAvailable(tx, w, l.product_id, l.quantity);
      await tx.execute(
        sql`INSERT INTO reservations VALUES(${w}::uuid,${o.id},${l.product_id},'MAIN',${l.quantity},true)`,
      );
    }
    await update("RESERVED");
  }
  if (c.action === "SCAN") {
    if (!["RESERVED", "PACKING"].includes(o.status))
      throw new DomainError("Önce stok rezervasyonu yapın");
    const [p] = await rows<{ id: string }>(
        tx,
        sql`SELECT id FROM products WHERE workspace_id=${w}::uuid AND barcode=${c.barcode}`,
      ),
      l = o.lines.find((l) => l.product_id === p?.id);
    if (!l) throw new DomainError("Barkod bu siparişe ait değil");
    if (l.packed >= l.quantity)
      throw new DomainError("Bu ürünün bütün adetleri doğrulandı");
    const b = await balance(tx, w, l.product_id);
    if (b.physical < b.reserved)
      throw new DomainError("Fiziksel stok rezervasyonları karşılamıyor");
    await tx.execute(
      sql`UPDATE order_lines SET packed=packed+1 WHERE workspace_id=${w}::uuid AND order_id=${o.id} AND product_id=${l.product_id}`,
    );
    l.packed++;
    await update(
      o.lines.every((l) => l.packed === l.quantity) ? "READY" : "PACKING",
    );
  }
  if (c.action === "SHIP") {
    if (["SHIPPED", "RETURN_PENDING", "RETURNED"].includes(o.status))
      return o.id;
    if (o.status !== "READY" || o.lines.some((l) => l.packed !== l.quantity))
      throw new DomainError(
        "Tüm ürünleri barkodla doğrulamadan sevk edemezsiniz",
      );
    for (const l of o.lines) {
      const b = await balance(tx, w, l.product_id);
      const [r] = await rows<{ quantity: number }>(
        tx,
        sql`SELECT quantity FROM reservations WHERE workspace_id=${w}::uuid AND order_id=${o.id} AND product_id=${l.product_id} AND active`,
      );
      if (!r || r.quantity !== l.quantity || b.physical < b.reserved)
        throw new DomainError("Rezervasyon veya fiziksel stok tutarsız");
      await movement(
        tx,
        a,
        l.product_id,
        "MAIN",
        -l.quantity,
        "SHIPMENT",
        o.id,
        "FBS sevkiyat • demo",
      );
    }
    await tx.execute(
      sql`UPDATE reservations SET active=false WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    await tx.execute(
      sql`INSERT INTO shipments VALUES(${w}::uuid,${o.id},${"DEMO-TRK-" + o.id.slice(0, 8)},now())`,
    );
    await tx.execute(
      sql`UPDATE orders SET status='SHIPPED',shipped_at=now() WHERE workspace_id=${w}::uuid AND id=${o.id}`,
    );
    const total = o.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
    await finance(tx, a, o, "SALE", total);
    await finance(
      tx,
      a,
      o,
      "COMMISSION",
      -Math.round((total * o.commission_bps) / 10000),
    );
    await finance(tx, a, o, "LOGISTICS", -o.logistics);
    if (o.lines.every((l) => l.unit_cost_try !== null))
      await finance(
        tx,
        a,
        o,
        "COGS",
        -o.lines.reduce(
          (s, l) => s + l.quantity * costInOrderCurrency(l.unit_cost_try!, o),
          0,
        ),
      );
    const [settings] = await rows<{ settings: { autoDraft: boolean } }>(
      tx,
      sql`SELECT settings FROM workspaces WHERE id=${w}::uuid`,
    );
    if (settings.settings.autoDraft) await draft(tx, w, o.id);
  }
  if (c.action === "CANCEL") {
    if (o.status === "CANCELLED") return o.id;
    if (!["NEW", "RESERVED", "PACKING", "READY"].includes(o.status))
      throw new DomainError(
        "Sevk edilen sipariş iptal edilemez; iade kullanın",
      );
    await tx.execute(
      sql`UPDATE reservations SET active=false WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    await update("CANCELLED");
  }
  if (c.action === "RETURN") {
    if (["RETURN_PENDING", "RETURNED"].includes(o.status)) return o.id;
    if (o.status !== "SHIPPED")
      throw new DomainError("Yalnızca sevk edilen sipariş iade alınabilir");
    await tx.execute(
      sql`INSERT INTO returns VALUES(${w}::uuid,${o.id},'PENDING',${c.reason},now(),null)`,
    );
    for (const l of o.lines)
      await movement(
        tx,
        a,
        l.product_id,
        "QUARANTINE",
        l.quantity,
        "RETURN_RECEIPT",
        o.id,
        c.reason,
      );
    await finance(
      tx,
      a,
      o,
      "REFUND",
      -o.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0),
    );
    await tx.execute(
      sql`UPDATE invoices SET status='CANCELLED' WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    await update("RETURN_PENDING");
  }
  if (c.action === "QC") {
    const [r] = await rows<{ status: string }>(
      tx,
      sql`SELECT status FROM returns WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    if (!r) throw new DomainError("İade kaydı bulunamadı");
    if (r.status !== "PENDING") return o.id;
    for (const l of o.lines) {
      await movement(
        tx,
        a,
        l.product_id,
        "QUARANTINE",
        -l.quantity,
        c.accept ? "QC_RELEASE" : "QC_REJECT",
        o.id,
        c.reason,
      );
      if (c.accept)
        await movement(
          tx,
          a,
          l.product_id,
          "MAIN",
          l.quantity,
          "QC_RELEASE",
          o.id,
          c.reason,
        );
    }
    if (c.accept) {
      const [cost] = await rows<{ amount: number }>(
        tx,
        sql`SELECT amount FROM financial_entries WHERE workspace_id=${w}::uuid AND order_id=${o.id} AND kind='COGS'`,
      );
      if (cost) await finance(tx, a, o, "COGS_REVERSAL", -cost.amount);
    }
    await tx.execute(
      sql`UPDATE returns SET status=${c.accept ? "ACCEPTED" : "REJECTED"},reviewed_at=now(),reason=${c.reason} WHERE workspace_id=${w}::uuid AND order_id=${o.id}`,
    );
    await update("RETURNED");
  }
  if (c.action === "INVOICE") {
    if (o.status !== "SHIPPED")
      throw new DomainError("Fatura taslağı için sevkiyat tamamlanmalı");
    await draft(tx, w, o.id);
  }
  if (c.action === "INVOICE_STATUS") {
    if (c.status === "DRAFT" && o.status !== "SHIPPED")
      throw new DomainError(
        "İade veya iptal edilen siparişin faturası aktifleştirilemez",
      );
    const updated = await rows(
      tx,
      sql`UPDATE invoices SET status=${c.status},error=${c.status === "ERROR" ? c.reason : null} WHERE workspace_id=${w}::uuid AND order_id=${o.id} RETURNING id`,
    );
    if (!updated.length) throw new DomainError("Fatura bulunamadı", 404);
  }
  return o.id;
}
