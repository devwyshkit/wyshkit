-- Add index on user_carts.vendor_id foreign key
-- Swiggy Dec 2025 pattern: Index foreign keys for better join performance
-- This index supports the foreign key constraint and improves query performance

CREATE INDEX IF NOT EXISTS user_carts_vendor_id_idx ON user_carts(vendor_id);


