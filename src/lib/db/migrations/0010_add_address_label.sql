-- Add label field to addresses table
-- Swiggy Dec 2025 pattern: Address categorization (Home/Work/Other)

ALTER TABLE "addresses" 
ADD COLUMN IF NOT EXISTS "label" text DEFAULT 'Home';

-- Add comment to explain the field
COMMENT ON COLUMN "addresses"."label" IS 'Address type: Home, Work, or Other';





