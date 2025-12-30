# Quick Fix Guide - Product Visibility Issue

## Problem
Products are not visible to users.

## Root Causes
1. RLS policies were consolidated in a way that may block public access
2. Vendors may not have `status = 'approved'`
3. Products may not have `is_active = true`

## Quick Fix Steps

### Step 1: Apply RLS Policy Fixes

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and run `src/lib/db/migrations/0029_fix_products_rls_policy.sql`
3. Copy and run `src/lib/db/migrations/0030_fix_vendors_rls_policy.sql`

**Option B: Via Supabase CLI**
```bash
supabase db push
```

### Step 2: Verify Data Status

1. Go to Supabase Dashboard → SQL Editor
2. Run queries from `src/lib/db/migrations/0031_verify_data_status.sql`
3. Check the results:
   - Are vendors `status = 'approved'`?
   - Are products `is_active = true`?

### Step 3: Fix Data (if needed)

**If vendors are not approved:**
```sql
-- Approve all pending vendors (adjust WHERE clause as needed)
UPDATE vendors 
SET status = 'approved', onboarding_status = 'approved'
WHERE status = 'pending';
```

**If products are inactive:**
```sql
-- Activate all products (adjust WHERE clause as needed)
UPDATE products 
SET is_active = true
WHERE is_active = false;
```

### Step 4: Re-seed Data (if needed)

If you need to reset everything:
```bash
# Make a POST request to /api/seed (requires admin auth)
curl -X POST http://localhost:3000/api/seed \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Step 5: Test

1. Open the app as an anonymous user
2. Check if products are visible on the homepage
3. Check if vendors are visible
4. Check browser console for any RLS errors

## Expected Results

After applying fixes:
- ✅ Products from approved vendors with `is_active = true` should be visible
- ✅ Vendors with `status = 'approved'` should be visible
- ✅ No RLS permission errors in console
- ✅ Homepage shows products and vendors

## Troubleshooting

### Products still not visible?

1. **Check vendor status:**
   ```sql
   SELECT id, name, status FROM vendors;
   ```
   - Vendors must have `status = 'approved'`

2. **Check product status:**
   ```sql
   SELECT id, name, is_active, vendor_id FROM products;
   ```
   - Products must have `is_active = true`

3. **Check RLS policies:**
   - Go to Supabase Dashboard → Database → Tables → products → Policies
   - Verify these policies exist:
     - "Public can view active products from approved vendors"
     - "Vendors can view own products"
     - "Admins can view all products"

4. **Check browser console:**
   - Look for RLS permission errors
   - Check network tab for failed requests

### Still having issues?

1. Check `RLS_CLEANUP_SUMMARY.md` for detailed information
2. Check `SECURITY_SETUP.md` for RLS documentation
3. Review migration files for policy details

## Files to Review

- `src/lib/db/migrations/0029_fix_products_rls_policy.sql` - Products RLS fix
- `src/lib/db/migrations/0030_fix_vendors_rls_policy.sql` - Vendors RLS fix
- `src/lib/db/migrations/0031_verify_data_status.sql` - Data verification queries
- `RLS_CLEANUP_SUMMARY.md` - Detailed cleanup summary
- `SECURITY_SETUP.md` - Full RLS documentation

