-- Allow a workspace deletion to cascade through the ownership graph atomically.
-- Referential integrity is still enforced at transaction COMMIT.
DO $$
DECLARE relation record;
BEGIN
 FOR relation IN SELECT c.conname,c.conrelid::regclass AS tbl FROM pg_constraint c
 WHERE c.contype='f' AND c.conrelid IN ('users'::regclass,'sessions'::regclass,'stores'::regclass,'warehouses'::regclass,'products'::regclass,'orders'::regclass,'order_lines'::regclass,'reservations'::regclass,'stock_ledger'::regclass,'shipments'::regclass,'invoices'::regclass,'financial_entries'::regclass,'returns'::regclass,'audit_events'::regclass,'command_receipts'::regclass)
 LOOP
 EXECUTE format('ALTER TABLE %s ALTER CONSTRAINT %I DEFERRABLE INITIALLY DEFERRED',relation.tbl,relation.conname);
 END LOOP;
END $$;
