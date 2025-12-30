-- Consolidate multiple permissive SELECT policies for better performance
-- Swiggy Dec 2025 pattern: Balance performance with security
-- This migration consolidates multiple permissive policies into single policies
-- to reduce RLS evaluation overhead while maintaining the same access control

-- Consolidate products SELECT policies
-- Current: 3 separate policies (Admins, Public, Vendors)
-- New: 1 consolidated policy with OR conditions
DROP POLICY IF EXISTS "Admins can view all products" ON products;
DROP POLICY IF EXISTS "Public can view active products from approved vendors" ON products;
DROP POLICY IF EXISTS "Vendors can view own products" ON products;

CREATE POLICY "Consolidated products SELECT policy"
ON products FOR SELECT
TO public
USING (
  -- Admins can view all products
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
  OR
  -- Public can view active products from approved vendors
  (
    is_active = true 
    AND EXISTS (
      SELECT 1 
      FROM vendors 
      WHERE vendors.id = products.vendor_id 
        AND vendors.status = 'approved'
    )
  )
  OR
  -- Vendors can view their own products (including inactive)
  EXISTS (
    SELECT 1 
    FROM vendors 
    WHERE vendors.id = products.vendor_id 
      AND vendors.user_id = (SELECT auth.uid())
  )
);

-- Consolidate vendors SELECT policies
-- Current: 2 separate policies (Public, Vendors) + 1 ALL policy for admins
-- Note: "Admins can manage all vendors" (ALL) already covers SELECT, so we keep it
-- New: 1 consolidated policy for non-admin access
DROP POLICY IF EXISTS "Public can view active vendors" ON vendors;
DROP POLICY IF EXISTS "Vendors can view own vendor" ON vendors;

CREATE POLICY "Consolidated vendors SELECT policy"
ON vendors FOR SELECT
TO public
USING (
  -- Public can view approved vendors
  status = 'approved'
  OR
  -- Vendors can view their own vendor (regardless of status)
  (SELECT auth.uid()) = user_id
);
-- Note: Admins are covered by "Admins can manage all vendors" (ALL) policy

