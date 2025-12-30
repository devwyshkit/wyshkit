-- Fix infinite recursion in users RLS policy
-- Swiggy Dec 2025 pattern: RLS policies must not cause infinite recursion
-- Problem: The vendors policy checks users table, and users policy was causing recursion
-- Solution: Simplify users policy to avoid recursive checks

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Recreate with non-recursive conditions
-- For users viewing their own data, just check auth.uid() directly
CREATE POLICY "Users can view own data"
ON users FOR SELECT
TO public
USING ((SELECT auth.uid()) = id);

-- For admins, use a simple function check (if available) or direct role check
-- Note: This assumes is_admin() function exists and doesn't cause recursion
-- If is_admin() causes recursion, we'll need to inline the check
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = (SELECT auth.uid())
      AND u.role = 'admin'
  )
);

-- However, the above still references users table which could cause recursion
-- Better approach: Use a security definer function or check role directly
-- For now, let's use a simpler approach that doesn't reference users table in the policy

-- Drop and recreate with a safer approach
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Use a function-based check if available, otherwise inline with minimal recursion risk
-- The key is to ensure the users table check doesn't trigger another users table check
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO public
USING (
  -- Check if current user is admin by checking their role directly
  -- This avoids recursion by not using a subquery that would trigger RLS
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = (SELECT auth.uid())
      AND u.role = 'admin'
    -- This subquery will be evaluated once per row, but should not cause infinite recursion
    -- because we're checking a specific user ID, not all users
  )
);

-- Actually, the safest approach is to use a security definer function
-- But for now, let's try a different approach: check role from auth.jwt()
-- However, Supabase doesn't expose role in JWT by default
-- So we need to use a function or accept the subquery

-- Final approach: Use is_admin() function if it exists, otherwise create a simple check
-- that doesn't cause recursion by using security definer

-- Check if is_admin function exists
DO $$
BEGIN
  -- If is_admin function doesn't exist, create a simple one
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_admin'
  ) THEN
    -- Create a security definer function to check admin role
    -- This bypasses RLS when checking the role
    CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $$
      SELECT EXISTS (
        SELECT 1
        FROM users
        WHERE id = user_id
          AND role = 'admin'
      );
    $$;
  END IF;
END $$;

-- Now use the function in the policy
DROP POLICY IF EXISTS "Admins can view all users" ON users;

CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO public
USING (is_admin((SELECT auth.uid())));


