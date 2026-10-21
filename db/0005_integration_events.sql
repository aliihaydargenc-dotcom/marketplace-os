CREATE TABLE IF NOT EXISTS integration_events (
 workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
 id text NOT NULL, order_id text NOT NULL, provider text NOT NULL CHECK(provider IN ('OZON','PARASUT')),
 operation text NOT NULL CHECK(operation IN ('DEMO_SHIPPED','SALES_INVOICE')),
 reference text NOT NULL, mode text NOT NULL CHECK(mode='demo'),
 sent boolean NOT NULL CHECK(sent=false), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,provider,operation,reference),
 FOREIGN KEY(workspace_id,order_id) REFERENCES orders(workspace_id,id) DEFERRABLE INITIALLY DEFERRED
);
