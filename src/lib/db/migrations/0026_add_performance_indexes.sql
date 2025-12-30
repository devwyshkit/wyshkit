-- Add performance indexes for common query patterns
-- Swiggy Dec 2025 pattern: Index frequently queried columns for better performance

-- Composite index for vendors(status, is_online) - common query pattern
-- Note: is_online filter was removed from application code, but index helps if needed
CREATE INDEX IF NOT EXISTS vendors_status_online_idx ON public.vendors (status, is_online) 
WHERE status = 'approved';

-- Index for orders(customer_id, status) - for customer order queries
CREATE INDEX IF NOT EXISTS orders_customer_status_idx ON public.orders (customer_id, status);

-- Index for orders(vendor_id, status) - for vendor order queries  
CREATE INDEX IF NOT EXISTS orders_vendor_status_idx ON public.orders (vendor_id, status);

-- Index for orders(created_at) - for time-based queries (already exists via primary key, but explicit for clarity)
-- Note: This might already exist, but IF NOT EXISTS handles it gracefully


