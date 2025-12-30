-- Data verification queries to check vendor and product statuses
-- Swiggy Dec 2025 pattern: Comprehensive data audit before cleanup
-- Run these queries manually in Supabase SQL Editor to verify data

-- 1. Check vendor statuses
-- Expected: All vendors should have status = 'approved' for products to be visible
SELECT 
  id, 
  name, 
  status, 
  onboarding_status,
  is_online,
  city,
  created_at
FROM vendors 
ORDER BY created_at DESC;

-- 2. Check products with their vendor status
-- This shows which products should be visible (is_active = true AND vendor.status = 'approved')
SELECT 
  p.id, 
  p.name, 
  p.is_active,
  p.vendor_id,
  v.name as vendor_name,
  v.status as vendor_status,
  v.onboarding_status as vendor_onboarding_status
FROM products p
LEFT JOIN vendors v ON p.vendor_id = v.id
ORDER BY p.created_at DESC;

-- 3. Find products that should be visible but vendor is not approved
-- These products won't show up for public users
SELECT 
  p.id, 
  p.name,
  p.is_active,
  v.name as vendor_name,
  v.status as vendor_status,
  v.onboarding_status as vendor_onboarding_status
FROM products p
JOIN vendors v ON p.vendor_id = v.id
WHERE p.is_active = true 
  AND v.status != 'approved';

-- 4. Find inactive products from approved vendors
-- These products won't show up for public users
SELECT 
  p.id, 
  p.name,
  p.is_active,
  v.name as vendor_name,
  v.status as vendor_status
FROM products p
JOIN vendors v ON p.vendor_id = v.id
WHERE p.is_active = false 
  AND v.status = 'approved';

-- 5. Count products by visibility status
SELECT 
  CASE 
    WHEN p.is_active = true AND v.status = 'approved' THEN 'Visible to Public'
    WHEN p.is_active = false AND v.status = 'approved' THEN 'Hidden (Inactive Product)'
    WHEN p.is_active = true AND v.status != 'approved' THEN 'Hidden (Vendor Not Approved)'
    ELSE 'Hidden (Both Issues)'
  END as visibility_status,
  COUNT(*) as product_count
FROM products p
LEFT JOIN vendors v ON p.vendor_id = v.id
GROUP BY visibility_status;

-- 6. Count vendors by status
SELECT 
  status,
  COUNT(*) as vendor_count
FROM vendors
GROUP BY status;

-- 7. Update all test/seed vendors to approved status (if needed)
-- WARNING: Only run this if you want to approve all vendors
-- Uncomment and run manually if needed:
/*
UPDATE vendors 
SET status = 'approved', onboarding_status = 'approved'
WHERE status IN ('pending', 'test')
  AND id IN (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005'
  );
*/

-- 8. Ensure all seed products are active (if needed)
-- WARNING: Only run this if you want to activate all seed products
-- Uncomment and run manually if needed:
/*
UPDATE products 
SET is_active = true
WHERE id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000007',
  '20000000-0000-0000-0000-000000000008',
  '20000000-0000-0000-0000-000000000009',
  '20000000-0000-0000-0000-000000000010'
);
*/

