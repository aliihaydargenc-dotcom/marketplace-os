CREATE TABLE IF NOT EXISTS inventory_documents (
 workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
 id text NOT NULL, kind text NOT NULL CHECK(kind IN ('RECEIPT','COUNT')),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','CONFIRMED','CANCELLED')),
 source_reference text NOT NULL, source_order_id text, reason text NOT NULL,
 version integer NOT NULL DEFAULT 0 CHECK(version >= 0),
 created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 confirmed_by text, confirmed_at timestamptz, cancelled_by text, cancelled_at timestamptz,
 PRIMARY KEY(workspace_id,id),
 FOREIGN KEY(workspace_id,source_order_id) REFERENCES orders(workspace_id,id) DEFERRABLE INITIALLY DEFERRED,
 CHECK((status = 'CONFIRMED') = (confirmed_at IS NOT NULL)),
 CHECK((status = 'CANCELLED') = (cancelled_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS inventory_document_lines (
 workspace_id uuid NOT NULL, document_id text NOT NULL, product_id text NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 0 AND 100000),
 expected_physical integer NOT NULL CHECK(expected_physical >= 0),
 delta integer,
 PRIMARY KEY(workspace_id,document_id,product_id),
 FOREIGN KEY(workspace_id,document_id) REFERENCES inventory_documents(workspace_id,id) ON DELETE CASCADE,
 FOREIGN KEY(workspace_id,product_id) REFERENCES products(workspace_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS inventory_documents_date_idx ON inventory_documents(workspace_id,created_at DESC);

-- Defer ownership checks so cascading workspace deletion can remove all related rows atomically.
ALTER TABLE inventory_documents ALTER CONSTRAINT inventory_documents_workspace_id_source_order_id_fkey DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE inventory_document_lines ALTER CONSTRAINT inventory_document_lines_workspace_id_product_id_fkey DEFERRABLE INITIALLY DEFERRED;
