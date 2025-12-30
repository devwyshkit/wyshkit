-- Fix vendors public RLS policy to avoid unnecessary users table queries
-- Swiggy Dec 2025 pattern: RLS policies should be simple and fast
-- Problem: Current policy queries users table unnecessarily for public access
-- Solution: Simplify to only check status='approved' for anonymous users
-- Admins and vendors are already covered by separate policies

-- Drop and recreate simplified policy
DROP POLICY IF EXISTS "Public can view active vendors" ON vendors;
CREATE POLICY "Public can view active vendors"
ON vendors FOR SELECT
TO public
USING (status = 'approved');

-- Add separate policy for vendors to view their own vendor (for editing)
-- This allows vendors to see their vendor even if not approved
DROP POLICY IF EXISTS "Vendors can view own vendor" ON vendors;
CREATE POLICY "Vendors can view own vendor"
ON vendors FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

