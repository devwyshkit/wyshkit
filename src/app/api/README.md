# API Routes Documentation

## Swiggy Dec 2025 Pattern: API Route Usage

This document explains which API routes are used and why, following the principle of maximizing Supabase direct usage.

## Public API Routes (Kept for Specific Use Cases)

### `/api/vendors` and `/api/products`
- **Status**: Kept but NOT used by frontend
- **Reason**: 
  - Frontend uses direct Supabase hooks (`useVendors`, `useTrendingProducts`, `useProducts`)
  - Routes are kept for:
    - Rate limiting in middleware (public endpoints)
    - Potential SSR/SSG scenarios
    - External integrations (if needed)
- **Recommendation**: Can be removed if not needed for SSR/external use

### `/api/vendors/[id]`
- **Status**: Kept but NOT used by frontend
- **Reason**:
  - Frontend uses `useVendor` hook (direct Supabase)
  - Route is kept for:
    - Rate limiting in middleware
    - Potential SSR/SSG scenarios
    - External integrations
- **Recommendation**: Can be removed if not needed for SSR/external use

## Authenticated API Routes (Required)

### `/api/vendor/*`
- **Status**: Required
- **Reason**: Vendor-specific operations require authentication and server-side processing
- **Examples**: `/api/vendor/orders`, `/api/vendor/products`, `/api/vendor/dashboard`

### `/api/admin/*`
- **Status**: Required
- **Reason**: Admin operations require authentication and server-side processing

## Swiggy Dec 2025 Pattern Compliance

1. **Maximize Supabase**: Frontend uses direct Supabase calls via hooks
2. **RLS as Source of Truth**: All access control handled by RLS policies
3. **Simplicity**: Unused routes can be removed if not needed
4. **Performance**: Direct queries, no unnecessary API hops

## Migration Path

If removing unused routes:
1. Remove `/api/vendors/route.ts` (if not needed for SSR)
2. Remove `/api/vendors/[id]/route.ts` (if not needed for SSR)
3. Remove `/api/products/route.ts` (if not needed for SSR)
4. Update middleware to remove rate limiting for these routes

