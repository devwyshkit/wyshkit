-- Add missing public RLS policy for products
-- Swiggy Dec 2025 pattern: RLS is source of truth for all visibility logic
-- This policy allows anonymous/public users to view active products from approved vendors

-- Note: If this policy already exists, the migration will fail gracefully
-- This is expected if the policy was created manually or in a previous run
-- To handle gracefully, drop first if exists, then create
DROP POLICY IF EXISTS "Public can view active products from approved vendors" ON products;

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

