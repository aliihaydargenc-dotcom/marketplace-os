CREATE TABLE IF NOT EXISTS invoice_events (
 workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
 id text NOT NULL, invoice_id text NOT NULL, order_id text NOT NULL,
 from_status text CHECK(from_status IN ('DRAFT','ERROR','CANCELLED')),
 to_status text NOT NULL CHECK(to_status IN ('DRAFT','ERROR','CANCELLED')),
 reason text NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,id),
 FOREIGN KEY(workspace_id,invoice_id) REFERENCES invoices(workspace_id,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(workspace_id,order_id) REFERENCES orders(workspace_id,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);
