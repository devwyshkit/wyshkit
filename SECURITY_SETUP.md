# Security Setup Guide - Row Level Security (RLS)

## Overview

WyshKit uses Supabase Row Level Security (RLS) to ensure data isolation and prevent unauthorized access. All public tables have RLS enabled with comprehensive policies based on user roles.

## Current Status

✅ **RLS Enabled**: All 12 public tables have RLS enabled
✅ **Policies Created**: Comprehensive policies for all tables based on user roles
✅ **Indexes Added**: Performance indexes on foreign keys

## Tables with RLS Enabled

| Table | RLS Enabled | Policy Count | Access Control |
|-------|------------|-------------|----------------|
| `addresses` | ✅ | 4 | Users can only access their own addresses |
| `cashback_config` | ✅ | 3 | Admin only |
| `disputes` | ✅ | 3 | Customers see their disputes, admins see all |
| `notifications` | ✅ | 2 | Users see only their notifications |
| `orders` | ✅ | 5 | Customers see their orders, vendors see their vendor orders, admins see all |
| `otp_codes` | ✅ | 0 | Service role only (no anon access) |
| `product_reviews` | ✅ | 4 | Public read, users create/update their own |
| `products` | ✅ | 6 | Public read for active products, vendors manage their own |
| `users` | ✅ | 4 | Users can view/update their own data, admins see all |
| `vendors` | ✅ | 4 | Public read for approved vendors, vendors update their own |
| `wallet` | ✅ | 3 | Users access only their wallet |
| `wallet_transactions` | ✅ | 2 | Users see their own transactions |

## RLS Policy Details

### Users Table

- **View Own Data**: Users can view their own user record
- **Update Own Data**: Users can update their own user record
- **Insert Own Data**: Users can insert their own user record (during signup)
- **Admin Access**: Admins can view all users

### Addresses Table

- **View Own Addresses**: Users can view their own addresses
- **Insert Own Addresses**: Users can create addresses for themselves
- **Update Own Addresses**: Users can update their own addresses
- **Delete Own Addresses**: Users can delete their own addresses

### Vendors Table

- **Public View**: Anyone can view approved vendors
- **Vendor Access**: Vendors can view and update their own vendor record
- **Admin Access**: Admins can view and manage all vendors

### Products Table

- **Public View**: Anyone can view active products (`is_active = true`) from approved vendors (`vendors.status = 'approved'`)
- **Vendor View**: Vendors can view all their products (including inactive)
- **Vendor Management**: Vendors can insert, update, and delete their own products
- **Admin View**: Admins can view all products
- **Note**: Products require both `is_active = true` AND vendor `status = 'approved'` to be visible to public

### Orders Table

- **Customer View**: Customers can view their own orders
- **Vendor View**: Vendors can view orders for their vendor
- **Customer Insert**: Customers can create orders for themselves
- **Vendor Update**: Vendors can update orders for their vendor
- **Admin Access**: Admins can view and manage all orders

### Wallet Table

- **User View**: Users can view their own wallet
- **User Insert**: Users can create their own wallet (during account creation)
- **Admin View**: Admins can view all wallets
- **Note**: Wallet balance updates require service role (not handled by RLS)

### Wallet Transactions Table

- **User View**: Users can view transactions for their own wallet
- **Admin View**: Admins can view all wallet transactions
- **Note**: Transaction inserts require service role (not handled by RLS)

### Notifications Table

- **User View**: Users can view their own notifications
- **User Update**: Users can update their own notifications (mark as read)
- **Note**: Notification inserts require service role (not handled by RLS)

### Product Reviews Table

- **Public View**: Anyone can view all reviews
- **User Create**: Users can create reviews
- **User Update**: Users can update their own reviews
- **User Delete**: Users can delete their own reviews

### Cashback Config Table

- **Admin Only**: Only admins can view, insert, and update cashback configuration

### Disputes Table

- **Customer View**: Customers can view disputes for their orders
- **Customer Create**: Customers can create disputes for their orders
- **Admin Access**: Admins can view and manage all disputes

### OTP Codes Table

- **REMOVED**: This table has been removed as we use Supabase Auth for OTP authentication
- **Migration**: See `0008_remove_otp_codes_table.sql` for removal migration
- **Reason**: Maximizing Supabase usage, removing legacy code (Swiggy Dec 2025 pattern)

## User Roles

The system supports four user roles:

1. **customer**: Regular customers who can place orders
2. **vendor**: Vendors who can manage products and orders
3. **admin**: Administrators with full access
4. **partner**: Delivery partners (future use)

## Authentication

RLS policies use `auth.uid()` to identify the current user. This requires:

1. User must be authenticated via Supabase Auth
2. User's `id` in `public.users` table must match `auth.uid()`
3. User's role in `public.users` table determines access level

## Service Role vs Anon Key

- **Anon Key**: Used by client-side code, subject to RLS policies
- **Service Role Key**: Used by server-side code, bypasses RLS
  - Required for: Wallet updates, notification inserts, OTP code access
  - **Never expose service role key to client-side code**

## Checking RLS Status

### Via API Endpoint

```bash
curl http://localhost:3000/api/health/config
```

This endpoint returns:
- RLS status for all tables
- Policy counts
- Environment variable status
- Configuration recommendations

### Via Supabase Dashboard

1. Go to Supabase Dashboard → Database → Tables
2. Click on any table
3. Check "Row Level Security" toggle status
4. View policies in "Policies" tab

## Troubleshooting

### "Permission denied" errors

**Cause**: RLS is blocking access because:
- User is not authenticated
- No policy allows the operation
- User doesn't own the data

**Fix**:
1. Ensure user is authenticated
2. Check that user's `id` matches `auth.uid()`
3. Verify appropriate policy exists for the operation
4. Check user's role if role-based access is required

### Tables completely locked

**Cause**: RLS enabled but no policies created

**Fix**: Create appropriate policies (already done via migration)

### Service role queries failing

**Cause**: Service role key not set or incorrect

**Fix**: 
1. Verify `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
2. Ensure service role key has proper permissions
3. Never use service role key in client-side code

### Policies not working

**Cause**: 
- User's `id` doesn't match `auth.uid()`
- User not authenticated
- Policy conditions incorrect

**Fix**:
1. Verify user authentication
2. Check that `public.users.id` matches `auth.users.id`
3. Review policy conditions
4. Test with different user roles

## Performance Considerations

- RLS policies add overhead to queries
- Policies are evaluated for every row
- Use indexes on columns used in policy conditions
- Foreign key indexes have been added for performance

## Security Best Practices

1. ✅ **RLS Enabled**: All public tables have RLS enabled
2. ✅ **Policies Created**: Comprehensive policies for all access patterns
3. ✅ **Service Role Protected**: Service role key only used server-side
4. ✅ **Role-Based Access**: Policies respect user roles
5. ✅ **Data Isolation**: Users can only access their own data

## Migration History

- **Migration 0014**: `optimize_all_rls_policies` - Optimized RLS policies with init plan optimization
- **Migration 0018**: `add_public_products_rls_policy` - Added public access policy for products
- **Migration 0023**: `fix_users_rls_infinite_recursion` - Fixed infinite recursion in admin policies using `is_admin()` function
- **Migration 0024**: `fix_all_admin_rls_policies` - Fixed all admin policies to use `is_admin()` function
- **Migration 0025**: `fix_vendors_public_rls_policy` - Simplified vendors public policy
- **Migration 0028**: `consolidate_rls_select_policies` - Consolidated SELECT policies (DEPRECATED - replaced by 0029/0030/0032)
- **Migration 0029**: `fix_products_rls_policy` - Fixed products RLS with separate clear policies for better performance
- **Migration 0030**: `fix_vendors_rls_policy` - Fixed vendors RLS with separate clear policies
- **Migration 0031**: `verify_data_status` - Data verification queries (manual run)
- **Migration 0032**: `final_rls_cleanup` - Final cleanup to ensure all consolidated policies are removed and NULL handling is correct
- **Migration 0033**: `complete_rls_fix_and_data_verification` - Complete RLS fix ensuring all consolidated policies are removed and data is verified

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [RLS Policy Examples](https://supabase.com/docs/guides/auth/row-level-security#policy-examples)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)

## Support

If you encounter RLS-related issues:

1. Check `/api/health/config` endpoint for status
2. Review Supabase Dashboard → Database → Tables → Policies
3. Verify user authentication and role
4. Check server logs for detailed error messages

