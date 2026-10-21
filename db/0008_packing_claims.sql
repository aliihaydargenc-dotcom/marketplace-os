-- UX03-3: short-lived, workspace-scoped terminal ownership for demo packing.
CREATE TABLE IF NOT EXISTS packing_claims (
  workspace_id uuid NOT NULL,
  order_id text NOT NULL,
  terminal_id uuid NOT NULL,
  user_id text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, order_id),
  FOREIGN KEY (workspace_id, order_id) REFERENCES orders (workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, user_id) REFERENCES users (workspace_id, id)
);
CREATE INDEX IF NOT EXISTS packing_claims_expiry_idx ON packing_claims (workspace_id, expires_at);
