-- Optimize RLS policies by wrapping auth.uid() in SELECT
-- Swiggy Dec 2025 pattern: Init plan optimization for better performance
-- This prevents re-evaluation of auth.uid() for each row

-- Optimize user_carts RLS policies
DROP POLICY IF EXISTS "Users can read their own cart" ON user_carts;
CREATE POLICY "Users can read their own cart"
ON user_carts FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own cart" ON user_carts;
CREATE POLICY "Users can insert their own cart"
ON user_carts FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own cart" ON user_carts;
CREATE POLICY "Users can update their own cart"
ON user_carts FOR UPDATE
TO public
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own cart" ON user_carts;
CREATE POLICY "Users can delete their own cart"
ON user_carts FOR DELETE
TO public
USING ((SELECT auth.uid()) = user_id);

-- Optimize user_search_history RLS policies
DROP POLICY IF EXISTS "Users can read their own search history" ON user_search_history;
CREATE POLICY "Users can read their own search history"
ON user_search_history FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own search history" ON user_search_history;
CREATE POLICY "Users can insert their own search history"
ON user_search_history FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own search history" ON user_search_history;
CREATE POLICY "Users can delete their own search history"
ON user_search_history FOR DELETE
TO public
USING ((SELECT auth.uid()) = user_id);

-- Note: users table policy already uses is_admin() function which is optimized
-- Note: products and vendors policies use EXISTS subqueries which are already optimized


