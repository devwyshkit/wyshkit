-- Optimize all RLS policies by wrapping auth.uid() in SELECT
-- Swiggy Dec 2025 pattern: Init plan optimization for better performance
-- This prevents re-evaluation of auth.uid() for each row

-- Optimize users table policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data"
ON users FOR SELECT
TO public
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
TO public
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data"
ON users FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
);

-- Optimize addresses table policies
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
CREATE POLICY "Users can view own addresses"
ON addresses FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
CREATE POLICY "Users can insert own addresses"
ON addresses FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
CREATE POLICY "Users can update own addresses"
ON addresses FOR UPDATE
TO public
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;
CREATE POLICY "Users can delete own addresses"
ON addresses FOR DELETE
TO public
USING ((SELECT auth.uid()) = user_id);

-- Optimize vendors table policies
DROP POLICY IF EXISTS "Public can view active vendors" ON vendors;
CREATE POLICY "Public can view active vendors"
ON vendors FOR SELECT
TO public
USING (
  status = 'approved' 
  OR EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND (
        users.role = 'admin' 
        OR (users.role = 'vendor' AND vendors.user_id = (SELECT auth.uid()))
      )
  )
);

DROP POLICY IF EXISTS "Vendors can insert own vendor" ON vendors;
CREATE POLICY "Vendors can insert own vendor"
ON vendors FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Vendors can update own vendor" ON vendors;
CREATE POLICY "Vendors can update own vendor"
ON vendors FOR UPDATE
TO public
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can manage all vendors" ON vendors;
CREATE POLICY "Admins can manage all vendors"
ON vendors FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
);

-- Optimize products table policies
DROP POLICY IF EXISTS "Vendors can view own products" ON products;
CREATE POLICY "Vendors can view own products"
ON products FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM vendors 
    WHERE vendors.id = products.vendor_id 
      AND vendors.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Vendors can insert own products" ON products;
CREATE POLICY "Vendors can insert own products"
ON products FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM vendors 
    WHERE vendors.id = products.vendor_id 
      AND vendors.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Vendors can update own products" ON products;
CREATE POLICY "Vendors can update own products"
ON products FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM vendors 
    WHERE vendors.id = products.vendor_id 
      AND vendors.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM vendors 
    WHERE vendors.id = products.vendor_id 
      AND vendors.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Vendors can delete own products" ON products;
CREATE POLICY "Vendors can delete own products"
ON products FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM vendors 
    WHERE vendors.id = products.vendor_id 
      AND vendors.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can view all products" ON products;
CREATE POLICY "Admins can view all products"
ON products FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
);

-- Optimize orders table policies
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
TO public
USING ((SELECT auth.uid()) = customer_id);

DROP POLICY IF EXISTS "Customers can insert own orders" ON orders;
CREATE POLICY "Customers can insert own orders"
ON orders FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = customer_id);

DROP POLICY IF EXISTS "Vendors can view own vendor orders" ON orders;
CREATE POLICY "Vendors can view own vendor orders"
ON orders FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM vendors 
    WHERE vendors.id = orders.vendor_id 
      AND vendors.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Vendors can update own vendor orders" ON orders;
CREATE POLICY "Vendors can update own vendor orders"
ON orders FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM vendors 
    WHERE vendors.id = orders.vendor_id 
      AND vendors.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM vendors 
    WHERE vendors.id = orders.vendor_id 
      AND vendors.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders"
ON orders FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
);

-- Optimize wallet table policies
DROP POLICY IF EXISTS "Users can view own wallet" ON wallet;
CREATE POLICY "Users can view own wallet"
ON wallet FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own wallet" ON wallet;
CREATE POLICY "Users can insert own wallet"
ON wallet FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all wallets" ON wallet;
CREATE POLICY "Admins can view all wallets"
ON wallet FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
);

-- Optimize wallet_transactions table policies
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
ON wallet_transactions FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM wallet 
    WHERE wallet.id = wallet_transactions.wallet_id 
      AND wallet.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON wallet_transactions;
CREATE POLICY "Admins can view all wallet transactions"
ON wallet_transactions FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
);

-- Optimize notifications table policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO public
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Optimize product_reviews table policies
DROP POLICY IF EXISTS "Users can insert own reviews" ON product_reviews;
CREATE POLICY "Users can insert own reviews"
ON product_reviews FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON product_reviews;
CREATE POLICY "Users can update own reviews"
ON product_reviews FOR UPDATE
TO public
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON product_reviews;
CREATE POLICY "Users can delete own reviews"
ON product_reviews FOR DELETE
TO public
USING ((SELECT auth.uid()) = user_id);

-- Optimize cashback_config table policies
DROP POLICY IF EXISTS "Admins can view cashback config" ON cashback_config;
CREATE POLICY "Admins can view cashback config"
ON cashback_config FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can insert cashback config" ON cashback_config;
CREATE POLICY "Admins can insert cashback config"
ON cashback_config FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update cashback config" ON cashback_config;
CREATE POLICY "Admins can update cashback config"
ON cashback_config FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
);

-- Optimize disputes table policies
DROP POLICY IF EXISTS "Customers can view own disputes" ON disputes;
CREATE POLICY "Customers can view own disputes"
ON disputes FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM orders 
    WHERE orders.id = disputes.order_id 
      AND orders.customer_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Customers can insert own disputes" ON disputes;
CREATE POLICY "Customers can insert own disputes"
ON disputes FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM orders 
    WHERE orders.id = disputes.order_id 
      AND orders.customer_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can manage all disputes" ON disputes;
CREATE POLICY "Admins can manage all disputes"
ON disputes FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
  )
);


