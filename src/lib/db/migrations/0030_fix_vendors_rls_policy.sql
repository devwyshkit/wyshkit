-- Fix vendors RLS policy - separate clear policies for better performance and debugging
-- Swiggy Dec 2025 pattern: Simple, performant RLS policies with clear separation of concerns
-- This migration fixes the consolidated policy and ensures proper vendor visibility

-- Drop all existing vendor SELECT policies
DROP POLICY IF EXISTS "Consolidated vendors SELECT policy" ON vendors;
DROP POLICY IF EXISTS "Public can view active vendors" ON vendors;
DROP POLICY IF EXISTS "Vendors can view own vendor" ON vendors;

-- Policy 1: Public can view approved vendors
-- This allows anonymous users to see vendors that are approved
-- Simple and fast - no nested queries for public access
CREATE POLICY "Public can view approved vendors"
ON vendors FOR SELECT
TO public
USING (status = 'approved');

-- Policy 2: Vendors can view their own vendor (regardless of status)
-- This allows vendors to see their own vendor profile even if not approved yet
-- Essential for vendors to manage their profile during onboarding
-- Explicitly check auth.uid() is NOT NULL to avoid NULL comparison issues
CREATE POLICY "Vendors can view own vendor"
ON vendors FOR SELECT
TO public
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid()) = user_id
);

-- Policy 3: Admins can view all vendors
-- This is already handled by "Admins can manage all vendors" (ALL) policy from migration 0024
-- But we ensure it exists for clarity
-- Note: The ALL policy covers SELECT, INSERT, UPDATE, DELETE, so we don't need a separate SELECT policy

-- Verify admin policy exists (informational)
-- If "Admins can manage all vendors" doesn't exist, it should be created by migration 0024
-- This migration assumes it exists and doesn't recreate it to avoid conflicts

