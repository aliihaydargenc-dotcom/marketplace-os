-- Additive: old clients/inserts keep working through defaults, no existing identity or stock changes.
ALTER TABLE products ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_version integer NOT NULL DEFAULT 0 CHECK(catalog_version >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS source jsonb NOT NULL DEFAULT '{}';
