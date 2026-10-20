CREATE TABLE IF NOT EXISTS workspaces (
 id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 generation integer NOT NULL DEFAULT 1, settings jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS users (
 workspace_id uuid REFERENCES workspaces ON DELETE CASCADE, id text NOT NULL, name text NOT NULL,
 role text NOT NULL CHECK(role IN ('ADMIN','WAREHOUSE','ACCOUNTANT')), active boolean NOT NULL DEFAULT true,
 PRIMARY KEY(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
 user_id text NOT NULL, expires_at timestamptz NOT NULL,
 FOREIGN KEY(workspace_id,user_id) REFERENCES users(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS stores (
 workspace_id uuid REFERENCES workspaces ON DELETE CASCADE, id text NOT NULL, name text NOT NULL,
 PRIMARY KEY(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS warehouses (
 workspace_id uuid REFERENCES workspaces ON DELETE CASCADE, id text NOT NULL, name text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('SELLABLE','QUARANTINE','FBO_REFERENCE')), PRIMARY KEY(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS products (
 workspace_id uuid REFERENCES workspaces ON DELETE CASCADE, id text NOT NULL, sku text NOT NULL,
 name text NOT NULL, variant text NOT NULL, barcode text NOT NULL, category text NOT NULL,
 cost_try integer CHECK(cost_try >= 0), price_rub integer NOT NULL CHECK(price_rub > 0),
 threshold integer NOT NULL CHECK(threshold >= 0), PRIMARY KEY(workspace_id,id),
 UNIQUE(workspace_id,sku), UNIQUE(workspace_id,barcode)
);
CREATE TABLE IF NOT EXISTS orders (
 workspace_id uuid REFERENCES workspaces ON DELETE CASCADE, id text NOT NULL, store_id text NOT NULL,
 number text NOT NULL, customer text NOT NULL, fulfillment text NOT NULL CHECK(fulfillment IN ('FBS','FBO')),
 status text NOT NULL CHECK(status IN ('NEW','RESERVED','PACKING','READY','SHIPPED','CANCELLED','RETURN_PENDING','RETURNED')),
 currency text NOT NULL CHECK(currency IN ('RUB','TRY')), created_at timestamptz NOT NULL,
 shipped_at timestamptz, fx_date date NOT NULL, fx_rate integer NOT NULL CHECK(fx_rate > 0),
 commission_bps integer NOT NULL CHECK(commission_bps BETWEEN 0 AND 10000), logistics integer NOT NULL CHECK(logistics >= 0),
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,number),
 FOREIGN KEY(workspace_id,store_id) REFERENCES stores(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS order_lines (
 workspace_id uuid NOT NULL, order_id text NOT NULL, product_id text NOT NULL,
 quantity integer NOT NULL CHECK(quantity > 0), packed integer NOT NULL DEFAULT 0 CHECK(packed >= 0 AND packed <= quantity),
 unit_price integer NOT NULL CHECK(unit_price > 0), unit_cost_try integer CHECK(unit_cost_try >= 0),
 PRIMARY KEY(workspace_id,order_id,product_id),
 FOREIGN KEY(workspace_id,order_id) REFERENCES orders(workspace_id,id) ON DELETE CASCADE,
 FOREIGN KEY(workspace_id,product_id) REFERENCES products(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS reservations (
 workspace_id uuid NOT NULL, order_id text NOT NULL, product_id text NOT NULL, warehouse_id text NOT NULL,
 quantity integer NOT NULL CHECK(quantity > 0), active boolean NOT NULL DEFAULT true,
 PRIMARY KEY(workspace_id,order_id,product_id),
 FOREIGN KEY(workspace_id,order_id,product_id) REFERENCES order_lines(workspace_id,order_id,product_id) ON DELETE CASCADE,
 FOREIGN KEY(workspace_id,warehouse_id) REFERENCES warehouses(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS stock_ledger (
 workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE, id text NOT NULL,
 product_id text NOT NULL, warehouse_id text NOT NULL, quantity integer NOT NULL CHECK(quantity <> 0),
 kind text NOT NULL CHECK(kind IN ('OPENING','SHIPMENT','RETURN_RECEIPT','QC_RELEASE','QC_REJECT','RECEIPT','ADJUSTMENT')),
 reference text NOT NULL, reason text NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL,
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,reference,product_id,warehouse_id,kind),
 FOREIGN KEY(workspace_id,product_id) REFERENCES products(workspace_id,id),
 FOREIGN KEY(workspace_id,warehouse_id) REFERENCES warehouses(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS shipments (
 workspace_id uuid NOT NULL, order_id text NOT NULL, tracking text NOT NULL, created_at timestamptz NOT NULL,
 PRIMARY KEY(workspace_id,order_id), FOREIGN KEY(workspace_id,order_id) REFERENCES orders(workspace_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS invoices (
 workspace_id uuid NOT NULL, order_id text NOT NULL, id text NOT NULL, status text NOT NULL CHECK(status IN ('DRAFT','CANCELLED','ERROR')),
 label text NOT NULL DEFAULT 'DEMO / TASLAK' CHECK(label = 'DEMO / TASLAK'),
 created_at timestamptz NOT NULL, error text,
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,order_id),
 FOREIGN KEY(workspace_id,order_id) REFERENCES orders(workspace_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS financial_entries (
 workspace_id uuid NOT NULL, order_id text NOT NULL, id text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('SALE','REFUND','COMMISSION','LOGISTICS','COGS','COGS_REVERSAL')),
 amount integer NOT NULL, currency text NOT NULL CHECK(currency IN ('RUB','TRY')),
 created_at timestamptz NOT NULL, PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,order_id,kind),
 FOREIGN KEY(workspace_id,order_id) REFERENCES orders(workspace_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS returns (
 workspace_id uuid NOT NULL, order_id text NOT NULL, status text NOT NULL CHECK(status IN ('PENDING','ACCEPTED','REJECTED')),
 reason text NOT NULL, created_at timestamptz NOT NULL, reviewed_at timestamptz,
 PRIMARY KEY(workspace_id,order_id), FOREIGN KEY(workspace_id,order_id) REFERENCES orders(workspace_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS audit_events (
 workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE, id text NOT NULL, reference text NOT NULL,
 action text NOT NULL, actor text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL,
 PRIMARY KEY(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS command_receipts (
 workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE, key text NOT NULL, fingerprint text NOT NULL,
 result jsonb NOT NULL, PRIMARY KEY(workspace_id,key)
);
CREATE INDEX IF NOT EXISTS orders_date_idx ON orders(workspace_id,created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(workspace_id,status);
CREATE INDEX IF NOT EXISTS stock_balance_idx ON stock_ledger(workspace_id,product_id,warehouse_id);
CREATE INDEX IF NOT EXISTS audit_reference_idx ON audit_events(workspace_id,reference,created_at);
