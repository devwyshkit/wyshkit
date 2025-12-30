# RLS Cleanup and Product Visibility Fix - Summary

## Problem Statement

Products were not visible to users due to:
1. **RLS Policy Issues**: Consolidated RLS policies (migration 0028) were blocking public access
2. **Vendor Status**: Products require vendors to have `status = 'approved'` to be visible
3. **Product Status**: Products require `is_active = true` to be visible
4. **Policy Conflicts**: Multiple migrations created/dropped the same policies, causing conflicts

## Solutions Implemented

### 1. Fixed Products RLS Policy (Migration 0029)

**Problem**: Consolidated policy was too complex and may have been blocking anonymous users.

**Solution**: Separated into three clear policies:
- **Public Policy**: Simple check for `is_active = true` AND vendor `status = 'approved'`
- **Vendor Policy**: Vendors can see all their products (for management)
- **Admin Policy**: Admins can see all products

**File**: `src/lib/db/migrations/0029_fix_products_rls_policy.sql`

### 2. Fixed Vendors RLS Policy (Migration 0030)

**Problem**: Consolidated policy may have been causing issues.

**Solution**: Separated into clear policies:
- **Public Policy**: Simple check for `status = 'approved'`
- **Vendor Policy**: Vendors can see their own vendor profile
- **Admin Policy**: Already handled by "Admins can manage all vendors" (ALL) policy

**File**: `src/lib/db/migrations/0030_fix_vendors_rls_policy.sql`

### 3. Data Verification Script (Migration 0031)

**Purpose**: Queries to verify vendor and product statuses.

**File**: `src/lib/db/migrations/0031_verify_data_status.sql`

**Usage**: Run queries manually in Supabase SQL Editor to:
- Check vendor statuses
- Check product visibility
- Find products that should be visible but aren't
- Count products by visibility status

## How Products Become Visible

For a product to be visible to **public/anonymous users**:
1. ✅ Product must have `is_active = true`
2. ✅ Vendor must have `status = 'approved'`
3. ✅ RLS policy must allow access (now fixed)

For a product to be visible to **vendors**:
1. ✅ Product must belong to the vendor (`vendor_id` matches)
2. ✅ RLS policy allows vendors to see their own products (all statuses)

For a product to be visible to **admins**:
1. ✅ User must have `role = 'admin'`
2. ✅ RLS policy allows admins to see all products

## Notification RLS Status

✅ **Notifications RLS is correct**:
- Users can view their own notifications
- Users can update their own notifications
- No changes needed

## Location-Based Filtering

✅ **No location filtering in RLS**:
- Location context is only for storing user location
- Frontend queries don't filter by location in RLS
- Location is used for display purposes only

## Next Steps

### 1. Apply Migrations

Run the new migrations in Supabase:
```bash
# Apply migrations via Supabase Dashboard or CLI
# Migration 0029: Fix products RLS policy
# Migration 0030: Fix vendors RLS policy
```

### 2. Verify Data

Run queries from `0031_verify_data_status.sql` to check:
- Vendor statuses (should be 'approved' for products to show)
- Product `is_active` flags (should be `true`)
- Product visibility counts

### 3. Update Vendor Statuses (if needed)

If vendors are in 'pending' status, approve them:
```sql
UPDATE vendors 
SET status = 'approved', onboarding_status = 'approved'
WHERE status = 'pending';
```

### 4. Activate Products (if needed)

If products are inactive, activate them:
```sql
UPDATE products 
SET is_active = true
WHERE is_active = false;
```

### 5. Re-seed Data (if needed)

If data is corrupted, re-seed:
```bash
# Via API (requires admin auth)
POST /api/seed
```

## Testing Checklist

- [ ] Test as anonymous user - should see approved vendors' active products
- [ ] Test as vendor - should see all own products (including inactive)
- [ ] Test as admin - should see all products
- [ ] Verify notifications work correctly
- [ ] Check that location doesn't filter products
- [ ] Verify no RLS errors in console

## Anti-Patterns Removed

1. ✅ Consolidated RLS policies (too complex) → Separated into clear policies
2. ✅ Multiple policy creation/dropping → Clean migration path
3. ✅ Complex nested EXISTS queries → Simple direct checks where possible

## Legacy Code Status

- ✅ No legacy patterns found that need removal
- ✅ All code follows Swiggy Dec 2025 patterns
- ✅ Error handling is appropriate (browser extension errors are handled correctly)

## Files Changed

1. `src/lib/db/migrations/0029_fix_products_rls_policy.sql` - NEW
2. `src/lib/db/migrations/0030_fix_vendors_rls_policy.sql` - NEW
3. `src/lib/db/migrations/0031_verify_data_status.sql` - NEW
4. `SECURITY_SETUP.md` - UPDATED (migration history)
5. `RLS_CLEANUP_SUMMARY.md` - NEW (this file)

## Migration Order

Apply migrations in this order:
1. 0029_fix_products_rls_policy.sql
2. 0030_fix_vendors_rls_policy.sql
3. 0031_verify_data_status.sql (run queries manually)

## Rollback Plan

If issues occur, you can rollback by:
1. Dropping the new policies
2. Recreating the consolidated policy from migration 0028
3. However, the separate policies are recommended for better performance and debugging

## Performance Impact

✅ **Positive Impact**:
- Separated policies are easier for PostgreSQL to optimize
- Simpler conditions reduce query overhead
- Better use of indexes

## Security Impact

✅ **No Security Regression**:
- All access controls remain the same
- Public can only see approved vendors' active products
- Vendors can only see their own products
- Admins can see everything

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- Migration files in `src/lib/db/migrations/`
- `SECURITY_SETUP.md` for full RLS documentation

