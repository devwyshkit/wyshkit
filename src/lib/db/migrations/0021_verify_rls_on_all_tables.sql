-- Verify RLS is enabled on ALL tables
-- Swiggy Dec 2025 pattern: Explicit verification of critical security infrastructure
-- This migration verifies that RLS is enabled on all public tables

-- Check RLS status for all public tables
SELECT 
  tablename, 
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✓ RLS Enabled'
    ELSE '✗ RLS DISABLED - CRITICAL SECURITY ISSUE'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE '_prisma%'
ORDER BY 
  CASE WHEN rowsecurity THEN 1 ELSE 0 END, -- Show disabled first
  tablename;

-- List all tables that should have RLS enabled
-- Expected tables (as of migration 0021):
-- - addresses
-- - cashback_config
-- - disputes
-- - notifications
-- - orders
-- - product_reviews
-- - products
-- - users
-- - user_carts
-- - user_search_history
-- - vendors
-- - wallet
-- - wallet_transactions

-- If any table shows '✗ RLS DISABLED', run:
-- ALTER TABLE <tablename> ENABLE ROW LEVEL SECURITY;

-- Then create appropriate RLS policies for that table.

