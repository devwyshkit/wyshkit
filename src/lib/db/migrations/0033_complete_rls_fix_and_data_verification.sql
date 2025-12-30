-- Migration 0033: Complete RLS fix and data verification
-- Swiggy Dec 2025 pattern: Ensure perfect user experience with zero friction
-- This migration ensures consolidated policies are removed and data is correct

-- ============================================
-- STEP 1: Remove ALL consolidated policies
-- ============================================

-- Products table: Drop ALL possible policy names
DROP POLICY IF EXISTS "Consolidated products SELECT policy" ON products;
DROP POLICY IF EXISTS "Admins can view all products" ON products;
DROP POLICY IF EXISTS "Public can view active products from approved vendors" ON products;
DROP POLICY IF EXISTS "Vendors can view own products" ON products;

-- Vendors table: Drop ALL possible policy names
DROP POLICY IF EXISTS "Consolidated vendors SELECT policy" ON vendors;
DROP POLICY IF EXISTS "Public can view active vendors" ON vendors;
DROP POLICY IF EXISTS "Public can view approved vendors" ON vendors;
DROP POLICY IF EXISTS "Vendors can view own vendor" ON vendors;

-- ============================================
-- STEP 2: Create correct products policies
-- ============================================

-- Policy 1: Public access (anonymous users) - MUST work for anonymous users
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
CREATE POLICY "Admins can view all products"
ON products FOR SELECT
TO public
USING (is_admin((SELECT auth.uid())));

-- ============================================
-- STEP 3: Create correct vendors policies
-- ============================================

-- Policy 1: Public access (anonymous users)
CREATE POLICY "Public can view approved vendors"
ON vendors FOR SELECT
TO public
USING (status = 'approved');

-- Policy 2: Vendor access (authenticated vendors only)
CREATE POLICY "Vendors can view own vendor"
ON vendors FOR SELECT
TO public
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid()) = user_id
);

-- ============================================
-- STEP 4: Data verification and fix
-- ============================================

-- Ensure all approved vendors have at least one active product (if products exist)
-- This is informational - we don't force products to be active
DO $$
DECLARE
  inactive_count INTEGER;
  approved_vendor_count INTEGER;
  vendors_without_products INTEGER;
BEGIN
  -- Count inactive products from approved vendors
  SELECT COUNT(*) INTO inactive_count
  FROM products p
  JOIN vendors v ON p.vendor_id = v.id
  WHERE v.status = 'approved' AND p.is_active = false;
  
  -- Count approved vendors
  SELECT COUNT(*) INTO approved_vendor_count
  FROM vendors
  WHERE status = 'approved';
  
  -- Count approved vendors without any products
  SELECT COUNT(*) INTO vendors_without_products
  FROM vendors v
  WHERE v.status = 'approved'
    AND NOT EXISTS (SELECT 1 FROM products p WHERE p.vendor_id = v.id);
  
  -- Log for debugging (this will show in migration logs)
  RAISE NOTICE 'Approved vendors: %, Inactive products from approved vendors: %, Approved vendors without products: %', 
    approved_vendor_count, inactive_count, vendors_without_products;
  
  -- If there are inactive products from approved vendors, they won't be visible to public
  -- This is expected behavior - only active products should be visible
  IF inactive_count > 0 THEN
    RAISE NOTICE 'Note: % products from approved vendors are inactive and will not be visible to public (expected behavior)', inactive_count;
  END IF;
  
  -- If there are approved vendors without products, that's also expected
  IF vendors_without_products > 0 THEN
    RAISE NOTICE 'Note: % approved vendors have no products (expected - vendors can be approved before adding products)', vendors_without_products;
  END IF;
END $$;

