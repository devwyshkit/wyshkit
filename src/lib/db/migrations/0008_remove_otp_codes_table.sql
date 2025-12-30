-- Remove legacy otp_codes table
-- We use Supabase Auth for OTP authentication, so this table is no longer needed
-- Swiggy Dec 2025 pattern: Maximize Supabase usage, remove legacy code

-- Drop indexes first
DROP INDEX IF EXISTS public.otp_codes_phone_idx;
DROP INDEX IF EXISTS public.otp_codes_expires_at_idx;

-- Drop the table
DROP TABLE IF EXISTS public.otp_codes;





