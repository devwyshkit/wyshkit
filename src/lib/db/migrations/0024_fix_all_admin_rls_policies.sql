-- Fix all admin RLS policies to use is_admin() function
-- Swiggy Dec 2025 pattern: Prevent infinite recursion by using SECURITY DEFINER function
-- This migration fixes 9 admin policies that directly query users table, causing infinite recursion

-- Ensure is_admin() function exists (from migration 0023)
-- If it doesn't exist, create it
DO $$
BEGIN
  -- If is_admin function doesn't exist, create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_admin'
  ) THEN
    -- Create a security definer function to check admin role
    -- This bypasses RLS when checking the role
    CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER -- IMPORTANT: This makes the function run with definer's privileges
    SET search_path = public, pg_temp
    AS $$
    BEGIN
      RETURN EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND role = 'admin');
    END;
    $$;

    -- Grant execution to authenticated users and public
    GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO public;
  END IF;
END $$;

-- Fix users table policy (ensure it uses is_admin() even if migration 0014 overwrote it)
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO public
USING (is_admin((SELECT auth.uid())));

-- Fix vendors table policy
DROP POLICY IF EXISTS "Admins can manage all vendors" ON vendors;
CREATE POLICY "Admins can manage all vendors"
ON vendors FOR ALL
TO public
USING (is_admin((SELECT auth.uid())))
WITH CHECK (is_admin((SELECT auth.uid())));

-- Fix products table policy
DROP POLICY IF EXISTS "Admins can view all products" ON products;
CREATE POLICY "Admins can view all products"
ON products FOR SELECT
TO public
USING (is_admin((SELECT auth.uid())));

-- Fix orders table policy
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders"
ON orders FOR ALL
TO public
USING (is_admin((SELECT auth.uid())))
WITH CHECK (is_admin((SELECT auth.uid())));

-- Fix wallet table policy
DROP POLICY IF EXISTS "Admins can view all wallets" ON wallet;
CREATE POLICY "Admins can view all wallets"
ON wallet FOR SELECT
TO public
USING (is_admin((SELECT auth.uid())));

-- Fix wallet_transactions table policy
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON wallet_transactions;
CREATE POLICY "Admins can view all wallet transactions"
ON wallet_transactions FOR SELECT
TO public
USING (is_admin((SELECT auth.uid())));

-- Fix cashback_config table policies (3 policies)
DROP POLICY IF EXISTS "Admins can view cashback config" ON cashback_config;
CREATE POLICY "Admins can view cashback config"
ON cashback_config FOR SELECT
TO public
USING (is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can insert cashback config" ON cashback_config;
CREATE POLICY "Admins can insert cashback config"
ON cashback_config FOR INSERT
TO public
WITH CHECK (is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can update cashback config" ON cashback_config;
CREATE POLICY "Admins can update cashback config"
ON cashback_config FOR UPDATE
TO public
USING (is_admin((SELECT auth.uid())))
WITH CHECK (is_admin((SELECT auth.uid())));

-- Fix disputes table policy
DROP POLICY IF EXISTS "Admins can manage all disputes" ON disputes;
CREATE POLICY "Admins can manage all disputes"
ON disputes FOR ALL
TO public
USING (is_admin((SELECT auth.uid())))
WITH CHECK (is_admin((SELECT auth.uid())));

-- Verify the function is SECURITY DEFINER (informational comment)
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'is_admin';
-- Should return prosecdef = true


