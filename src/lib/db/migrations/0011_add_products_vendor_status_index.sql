-- Add composite index for products query performance
-- Swiggy Dec 2025 pattern: Optimize queries that filter products by vendor_id and is_active
-- RLS policy handles vendor status filtering, so no join needed

-- Partial index for active products (most common query pattern)
CREATE INDEX IF NOT EXISTS products_active_approved_vendor_idx 
ON public.products(vendor_id) 
WHERE is_active = true;

-- Note: The vendors.status = 'approved' filter is handled by the inner join
-- The existing indexes on products.vendor_id and vendors.status should be sufficient
-- This partial index optimizes the most common query: active products by vendor

