import { database, sql, rows, type Conn } from "./db";
import type {
  Actor,
  Product,
  Order,
  OrderLine,
  WorkspaceSnapshot,
  Ledger,
  Invoice,
  FinancialEntry,
  AuditEvent,
  User,
  ReturnRecord,
} from "@/domain/types";
export async function snapshot(
  actor: Actor,
  conn: Conn = database(),
): Promise<WorkspaceSnapshot> {
  const w = actor.workspaceId;
  // One repeatable-read transaction is used by the HTTP endpoint to avoid mixing generations.
  const [workspace] = await rows<WorkspaceSnapshot["workspace"]>(
    conn,
    sql`SELECT id,name,generation,settings FROM workspaces WHERE id=${w}::uuid`,
  );
  const products = await rows<Product>(
    conn,
    sql`SELECT p.*,COALESCE(s.physical,0)::int physical,COALESCE(r.reserved,0)::int reserved,(COALESCE(s.physical,0)-COALESCE(r.reserved,0))::int available,COALESCE(s.quarantine,0)::int quarantine FROM products p LEFT JOIN (SELECT product_id,SUM(quantity) FILTER(WHERE warehouse_id='MAIN') physical,SUM(quantity) FILTER(WHERE warehouse_id='QUARANTINE') quarantine FROM stock_ledger WHERE workspace_id=${w}::uuid GROUP BY product_id) s ON s.product_id=p.id LEFT JOIN (SELECT product_id,SUM(quantity) reserved FROM reservations WHERE workspace_id=${w}::uuid AND active GROUP BY product_id) r ON r.product_id=p.id WHERE p.workspace_id=${w}::uuid ORDER BY p.sku`,
  );
  const orders = await rows<Order>(
    conn,
    sql`SELECT o.*,i.id invoice_id,i.status invoice_status,s.tracking FROM orders o LEFT JOIN invoices i ON i.workspace_id=o.workspace_id AND i.order_id=o.id LEFT JOIN shipments s ON s.workspace_id=o.workspace_id AND s.order_id=o.id WHERE o.workspace_id=${w}::uuid ORDER BY o.created_at DESC`,
  );
  const lines = await rows<OrderLine>(
    conn,
    sql`SELECT order_id,product_id,quantity,packed,unit_price,unit_cost_try FROM order_lines WHERE workspace_id=${w}::uuid`,
  );
  orders.forEach((o) => {
    o.lines = lines.filter((l) => l.order_id === o.id);
    o.total = o.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  });
  const ledger = await rows<Ledger>(
    conn,
    sql`SELECT id,product_id,warehouse_id,quantity,kind,reference,reason,actor,created_at FROM stock_ledger WHERE workspace_id=${w}::uuid ORDER BY created_at DESC`,
  );
  const invoices = await rows<Invoice>(
    conn,
    sql`SELECT id,order_id,status,label,created_at,error FROM invoices WHERE workspace_id=${w}::uuid ORDER BY created_at DESC`,
  );
  const financial = await rows<FinancialEntry>(
    conn,
    sql`SELECT id,order_id,kind,amount,currency,created_at FROM financial_entries WHERE workspace_id=${w}::uuid ORDER BY created_at DESC`,
  );
  const audit = await rows<AuditEvent>(
    conn,
    sql`SELECT id,reference,action,actor,details,created_at FROM audit_events WHERE workspace_id=${w}::uuid ORDER BY created_at DESC`,
  );
  const returns = await rows<ReturnRecord>(
    conn,
    sql`SELECT order_id,status,reason,created_at,reviewed_at FROM returns WHERE workspace_id=${w}::uuid`,
  );
  const users =
    actor.role === "ADMIN"
      ? await rows<User>(
          conn,
          sql`SELECT id,name,role,active FROM users WHERE workspace_id=${w}::uuid ORDER BY id`,
        )
      : [];
  // Warehouse users never receive financial purchase costs or financial ledger payloads.
  if (actor.role === "WAREHOUSE") {
    products.forEach((p) => (p.cost_try = null));
    orders.forEach((o) => o.lines.forEach((l) => (l.unit_cost_try = null)));
  }
  return JSON.parse(
    JSON.stringify({
      workspace,
      actor,
      products,
      orders,
      ledger,
      invoices: actor.role === "WAREHOUSE" ? [] : invoices,
      financial: actor.role === "WAREHOUSE" ? [] : financial,
      returns,
      audit:
        actor.role === "WAREHOUSE"
          ? audit.filter((e) =>
              [
                "CREATE_ORDER",
                "RESERVE",
                "SCAN",
                "SHIP",
                "CANCEL",
                "RETURN",
                "QC",
                "ADJUST",
              ].includes(e.action),
            )
          : audit,
      users,
    }),
  );
}
