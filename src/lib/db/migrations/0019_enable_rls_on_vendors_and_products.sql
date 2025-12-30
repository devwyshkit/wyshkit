-- Enable RLS on vendors and products tables
-- Swiggy Dec 2025 pattern: RLS is the foundation of all access control
-- This migration enables RLS that was missing from initial table creation

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled (informational comment)
-- After running this migration, verify with:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('vendors', 'products');

