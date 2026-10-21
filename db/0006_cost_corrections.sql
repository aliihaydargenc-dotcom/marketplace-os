CREATE TABLE IF NOT EXISTS order_cost_corrections (
 workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
 order_id text NOT NULL, product_id text NOT NULL,
 cost_try integer NOT NULL CHECK(cost_try BETWEEN 0 AND 10000000),
 reason text NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,order_id,product_id),
 FOREIGN KEY(workspace_id,order_id,product_id) REFERENCES order_lines(workspace_id,order_id,product_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);
