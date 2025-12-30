-- Verification script for RLS setup
-- Swiggy Dec 2025 pattern: Explicit verification of critical infrastructure
-- Run this manually to verify RLS is properly configured

-- Check RLS is enabled
SELECT 
  tablename, 
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✓ RLS Enabled'
    ELSE '✗ RLS DISABLED - CRITICAL ISSUE'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'vendors')
ORDER BY tablename;

-- Check public policies exist
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN roles @> ARRAY['public']::text[] THEN '✓ Public access'
    ELSE '✗ No public access'
  END as public_access
FROM pg_policies 
WHERE tablename IN ('products', 'vendors')
AND policyname LIKE '%Public%'
ORDER BY tablename, policyname;

