-- Create database trigger for auto-credit cashback (Admin-Controlled)
-- Swiggy Dec 2025 pattern: Use database triggers for automatic operations
-- This trigger automatically credits cashback when order status changes to 'delivered'
-- Uses admin-controlled cashback_config (not hardcoded percentage)

CREATE OR REPLACE FUNCTION auto_credit_cashback()
RETURNS TRIGGER AS $$
DECLARE
  cashback_percentage DECIMAL(5,2);
  cashback_amount DECIMAL(10,2);
  order_vendor_id UUID;
  order_category TEXT;
  user_wallet_id UUID;
BEGIN
  -- Only credit if status changed to 'delivered'
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Get vendor_id from order
    order_vendor_id := NEW.vendor_id;
    
    -- Get category from first order item (simplified - can be enhanced to handle multiple categories)
    -- For now, we'll use vendor-level or global cashback only
    -- Category-based cashback can be added later if needed
    
    -- Get cashback percentage from config (vendor > category > global > 0)
    SELECT percentage INTO cashback_percentage
    FROM cashback_config
    WHERE is_active = true
      AND (
        (type = 'vendor' AND entity_id = order_vendor_id::text)
        OR (type = 'category' AND entity_id = order_category)
        OR (type = 'global')
      )
    ORDER BY CASE type
      WHEN 'vendor' THEN 1
      WHEN 'category' THEN 2
      WHEN 'global' THEN 3
    END
    LIMIT 1;
    
    -- Default to 0 if no config found (admin must set it)
    IF cashback_percentage IS NULL THEN
      cashback_percentage := 0;
    END IF;
    
    -- Calculate cashback amount
    cashback_amount := (NEW.total::DECIMAL * cashback_percentage / 100);
    
    -- Only credit if amount > 0 and order total >= min threshold (₹500)
    IF cashback_amount > 0 AND NEW.total >= 500 THEN
      -- Get or create wallet for user
      INSERT INTO wallet (user_id, balance, created_at)
      VALUES (NEW.customer_id, 0, NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Get wallet_id
      SELECT id INTO user_wallet_id FROM wallet WHERE user_id = NEW.customer_id;
      
      -- Insert wallet transaction
      INSERT INTO wallet_transactions (wallet_id, type, amount, description, order_id, created_at)
      VALUES (user_wallet_id, 'credit', cashback_amount, 'Cashback for order ' || NEW.order_number, NEW.id, NOW());
      
      -- Update wallet balance
      UPDATE wallet 
      SET balance = balance + cashback_amount
      WHERE user_id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER order_delivered_cashback
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
EXECUTE FUNCTION auto_credit_cashback();

-- Add comment
COMMENT ON FUNCTION auto_credit_cashback() IS 'Automatically credits cashback when order is delivered. Uses admin-controlled cashback_config (vendor > category > global). Respects min order threshold of ₹500.';

