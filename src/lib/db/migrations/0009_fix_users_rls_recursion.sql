-- Fix RLS infinite recursion in users table
-- Swiggy Dec 2025 pattern: Use security definer function to avoid RLS recursion

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- Create a security definer function to check admin role
-- SECURITY DEFINER allows the function to bypass RLS when checking user role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
$$;

-- Recreate policy using the function (avoids recursion)
-- The function runs with SECURITY DEFINER, so it bypasses RLS when checking the users table
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
USING (
  auth.uid() = id OR  -- Users can view themselves
  public.is_admin()  -- Admins can view all (function bypasses RLS)
);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;




