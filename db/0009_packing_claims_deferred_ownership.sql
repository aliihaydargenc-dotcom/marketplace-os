-- Keep terminal ownership consistent with the existing deferred workspace graph.
-- Workspace deletion cascades through users and orders in unspecified order;
-- check both claim references after that cascade has completed.
ALTER TABLE packing_claims
  ALTER CONSTRAINT packing_claims_workspace_id_order_id_fkey
  DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE packing_claims
  ALTER CONSTRAINT packing_claims_workspace_id_user_id_fkey
  DEFERRABLE INITIALLY DEFERRED;
