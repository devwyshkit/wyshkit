-- Final RLS cleanup - ensure all consolidated policies are removed
-- Swiggy Dec 2025 pattern: Simple, clear policies with no unnecessary complexity
-- This migration ensures migrations 0029 and 0030 are properly applied and fixes any edge cases
-- Product Head approach: Ensure perfect user experience with zero friction

-- ============================================
-- PRODUCTS TABLE CLEANUP
-- ============================================

-- Drop ALL existing SELECT policies to start fresh (idempotent)
DROP POLICY IF EXISTS "Consolidated products SELECT policy" ON products;
DROP POLICY IF EXISTS "Admins can view all products" ON products;
DROP POLICY IF EXISTS "Public can view active products from approved vendors" ON products;
DROP POLICY IF EXISTS "Vendors can view own products" ON products;

-- Policy 1: Public access (anonymous users) - MUST work for anonymous users
-- This is the most important policy - it allows browsing without login
CREATE POLICY "Public can view active products from approved vendors"
ON products FOR SELECT
TO public
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 
    FROM vendors 
    WHERE vendors.id = products.vendor_id 
      AND vendors.status = 'approved'
  )
);

-- Policy 2: Vendor access (authenticated vendors only)
-- Explicitly check auth.uid() is NOT NULL to avoid NULL comparison issues
CREATE POLICY "Vendors can view own products"
ON products FOR SELECT
TO public
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM vendors 
    WHERE vendors.id = products.vendor_id 
      AND vendors.user_id = (SELECT auth.uid())
  )
);

-- Policy 3: Admin access
-- Uses is_admin() function which handles NULL auth.uid() correctly
CREATE POLICY "Admins can view all products"
ON products FOR SELECT
TO public
USING (is_admin((SELECT auth.uid())));

-- ============================================
-- VENDORS TABLE CLEANUP
-- ============================================

-- Drop ALL existing SELECT policies to start fresh (idempotent)
DROP POLICY IF EXISTS "Consolidated vendors SELECT policy" ON vendors;
DROP POLICY IF EXISTS "Public can view active vendors" ON vendors;
DROP POLICY IF EXISTS "Public can view approved vendors" ON vendors;
DROP POLICY IF EXISTS "Vendors can view own vendor" ON vendors;

-- Policy 1: Public access (anonymous users) - MUST work for anonymous users
-- Simple, fast check - no nested queries for maximum performance
CREATE POLICY "Public can view approved vendors"
ON vendors FOR SELECT
TO public
USING (status = 'approved');

-- Policy 2: Vendor access (authenticated vendors only)
-- Explicitly check auth.uid() is NOT NULL to avoid NULL comparison issues
CREATE POLICY "Vendors can view own vendor"
ON vendors FOR SELECT
TO public
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid()) = user_id
);

-- Note: Admin access is handled by "Admins can manage all vendors" (ALL) policy from migration 0024
-- This policy covers SELECT, INSERT, UPDATE, DELETE for admins

-- ============================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================

-- Test as anonymous user (should return products):
-- SELECT COUNT(*) FROM products;
-- Expected: Should return count of active products from approved vendors

-- Test as anonymous user (should return vendors):
-- SELECT COUNT(*) FROM vendors;
-- Expected: Should return count of approved vendors

-- Test as vendor (should see own products):
-- SELECT COUNT(*) FROM products WHERE vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid());
-- Expected: Should return count of vendor's products (all statuses)

-- Test as admin (should see all products):
-- SELECT COUNT(*) FROM products;
-- Expected: Should return count of ALL products (all statuses, all vendors)

