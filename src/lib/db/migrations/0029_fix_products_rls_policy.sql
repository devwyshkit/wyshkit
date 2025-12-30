-- Fix products RLS policy - separate clear policies for better performance and debugging
-- Swiggy Dec 2025 pattern: Simple, performant RLS policies with clear separation of concerns
-- This migration fixes the consolidated policy that may be blocking public access

-- Drop all existing product SELECT policies
DROP POLICY IF EXISTS "Consolidated products SELECT policy" ON products;
DROP POLICY IF EXISTS "Admins can view all products" ON products;
DROP POLICY IF EXISTS "Public can view active products from approved vendors" ON products;
DROP POLICY IF EXISTS "Vendors can view own products" ON products;

-- Policy 1: Public can view active products from approved vendors
-- This allows anonymous users to see products that are active and from approved vendors
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

-- Policy 2: Vendors can view their own products (all statuses, including inactive)
-- This allows vendors to see all their products for management purposes
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

-- Policy 3: Admins can view all products
-- This allows admins to see all products regardless of status
-- Uses is_admin() function from migration 0023/0024 to avoid recursion
CREATE POLICY "Admins can view all products"
ON products FOR SELECT
TO public
USING (is_admin((SELECT auth.uid())));

-- Note: INSERT, UPDATE, DELETE policies remain unchanged from previous migrations
-- These are handled by:
-- - "Vendors can insert own products"
-- - "Vendors can update own products"
-- - "Vendors can delete own products"
-- - "Admins can manage all vendors" (which covers products via ALL on vendors table)

