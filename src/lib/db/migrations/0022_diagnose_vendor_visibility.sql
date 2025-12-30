-- Diagnostic migration for vendor visibility issues
-- Swiggy Dec 2025 pattern: Comprehensive diagnostic queries to identify root cause

-- 1. Check if RLS is enabled on vendors table
SELECT 
  tablename, 
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✓ RLS Enabled'
    ELSE '✗ RLS DISABLED - CRITICAL: Run migration 0019'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'vendors';

-- 2. Check if public policy exists
SELECT 
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN roles @> ARRAY['public']::text[] THEN '✓ Public access allowed'
    ELSE '✗ No public access'
  END as public_access,
  qual as policy_condition
FROM pg_policies 
WHERE tablename = 'vendors'
AND policyname LIKE '%Public%';

-- 3. Check all policies on vendors table
SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'vendors'
ORDER BY policyname;

-- 4. Check vendor data state
SELECT 
  COUNT(*) as total_vendors,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_vendors,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_vendors,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_vendors,
  COUNT(*) FILTER (WHERE is_online = true) as online_vendors,
  COUNT(*) FILTER (WHERE status = 'approved' AND is_online = true) as approved_online_vendors
FROM vendors;

-- 5. Sample approved vendors
SELECT 
  id, 
  name, 
  status, 
  is_online,
  city,
  created_at
FROM vendors 
WHERE status = 'approved'
LIMIT 5;

-- 6. Test query that should work with public policy
-- This simulates what the frontend hook does
SELECT 
  id, 
  name, 
  description, 
  image, 
  city, 
  status, 
  is_online 
FROM vendors 
WHERE status = 'approved'
LIMIT 10;

