-- Fix vendor status data inconsistency and add constraint
-- Swiggy Dec 2025 pattern: Data integrity through constraints

-- Fix vendor with wrong status
UPDATE vendors 
SET status = 'approved' 
WHERE status = 'active' AND id = '10000000-0000-0000-0000-000000000010';

-- Add constraint to prevent invalid status values
ALTER TABLE vendors 
ADD CONSTRAINT vendors_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add comment explaining status values
COMMENT ON COLUMN vendors.status IS 'Vendor approval status: pending, approved, or rejected';

