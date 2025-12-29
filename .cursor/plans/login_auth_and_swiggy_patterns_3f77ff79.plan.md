# Login/Auth and Swiggy Dec 2025 Pattern Fixes

## Current State Analysis

**What We Already Have:**
- ✅ Better Auth configured with Drizzle adapter (using Supabase Postgres via DATABASE_URL)
- ✅ `useAuth` hook for client-side auth
- ✅ `requireAuth` server helpers for API routes
- ✅ Navbar + BottomNav in customer layout
- ✅ Database schema with users table
- ✅ Auth API route at `/api/auth/[...all]`

**What's Missing:**
- ❌ Login/Signup pages (app redirects to `/login` but page doesn't exist)
- ❌ Phone/OTP authentication (Better Auth doesn't have built-in phone provider)
- ❌ Navigation in vendor/admin layouts (only customer has Navbar + BottomNav)
- ❌ Protected route guards (middleware has TODOs)
- ❌ Share functionality
- ❌ Product reviews/ratings
- ❌ Pull to refresh
- ❌ Better empty states

## Swiggy Dec 2025 Patterns

**Navigation:**
- ✅ Bottom nav on ALL screens (Home, Search, Orders, Profile)
- ✅ Top navbar with location/search on ALL screens
- ✅ Consistent navigation across customer, vendor, admin

**Auth:**
- Phone-first OTP (no email required)
- Simple, clean login UI
- Auto-redirect after login

## Implementation Plan

### Phase 1: Add Navigation to All Screens (Swiggy Pattern)

**1.1 Update Vendor Layout** (`src/app/(vendor)/layout.tsx`)
- Add Navbar (vendor-specific: Orders, Products, Earnings, Profile)
- Add BottomNav (vendor-specific nav items)
- Match customer layout structure

**1.2 Update Admin Layout** (`src/app/(admin)/layout.tsx`)
- Add Navbar (admin-specific: Dashboard, Vendors, Orders, Analytics)
- Add BottomNav or sidebar (admin-specific nav)
- Match customer layout structure

**1.3 Create Vendor Navbar** (`src/components/layout/VendorNavbar.tsx`)
- Similar to customer Navbar but vendor-focused
- Show vendor name, orders count, earnings summary
- Location selector (vendor store location)

**1.4 Create Vendor BottomNav** (`src/components/layout/VendorBottomNav.tsx`)
- Orders, Products, Earnings, Profile tabs
- Notification badges on Orders tab

**1.5 Create Admin Navbar** (`src/components/layout/AdminNavbar.tsx`)
- Admin dashboard header
- Quick stats, alerts
- User menu

### Phase 2: Login/Signup Pages (Phone-First OTP)

**2.1 Create Auth Layout** (`src/app/(auth)/layout.tsx`)
- No Navbar/BottomNav (clean auth pages)
- Centered, max-width container
- Simple background

**2.2 Create Login Page** (`src/app/(auth)/login/page.tsx`)
- Phone number input (10 digits, +91 prefix)
- "Continue" button → Send OTP
- OTP input (6 digits) → Verify → Auto-login
- Link to signup
- "Sign in with Google" button (Better Auth social provider)
- Mobile-first, Swiggy-style simple UI

**2.3 Create Signup Page** (`src/app/(auth)/signup/page.tsx`)
- Same as login but "Create account" messaging
- After OTP verification, collect name (optional)
- Auto-login after signup

**2.4 Phone Input Component** (`src/components/auth/PhoneInput.tsx`)
- Indian phone format (+91)
- 10-digit validation
- Auto-format as user types

**2.5 OTP Input Component** (`src/components/auth/OtpInput.tsx`)
- 6-digit OTP input with auto-focus
- Auto-submit on 6 digits
- Resend OTP button (60s cooldown)

**2.6 Custom Phone/OTP Provider for Better Auth**
- Better Auth doesn't have built-in phone provider
- Create custom phone/OTP flow:
  - API route: `/api/auth/send-otp` - Send OTP via SMS (Razorpay SMS or Twilio)
  - API route: `/api/auth/verify-otp` - Verify OTP and create Better Auth session
  - Store OTP in database (users table or separate otp_codes table)
  - Use Better Auth's session management after OTP verification

**2.7 OTP Service** (`src/lib/services/otp.ts`)
- Send OTP via SMS (Razorpay SMS API - we already have Razorpay configured)
- Verify OTP code
- Store OTP in database with expiry (5 minutes)

**2.8 Update Better Auth Config** (`src/lib/auth/config.ts`)
- Add Google OAuth provider (Better Auth supports this)
- Keep existing Drizzle adapter (already using Supabase Postgres)

### Phase 3: Protected Route Guards

**3.1 Update Middleware** (`src/middleware.ts`)
- Check auth status for protected routes
- Redirect to `/login?returnUrl=/intended-path` for unauthenticated users
- Allow public routes (home, search, partner catalog, login, signup)

**3.2 Protected Route Component** (`src/components/auth/ProtectedRoute.tsx`)
- Wrapper component for protected pages
- Shows loading state while checking auth
- Redirects to login if not authenticated
- Preserves return URL for post-login redirect

**3.3 Update Pages to Use ProtectedRoute**
- `src/app/(customer)/orders/page.tsx` - Wrap with ProtectedRoute
- `src/app/(customer)/profile/page.tsx` - Wrap with ProtectedRoute
- `src/app/(customer)/cart/page.tsx` - Check auth before checkout (show login prompt)

**3.4 Guest Mode for Browse**
- Allow browsing without login
- Show "Sign in" prompts for actions (add to cart, checkout)
- Redirect to login when action requires auth

### Phase 4: Share Functionality

**4.1 Share Button Component** (`src/components/sharing/ShareButton.tsx`)
- Native Web Share API (mobile)
- Fallback: Copy link + toast
- Share product, vendor, or order

**4.2 Add Share to Product Sheet**
- Share button in `ProductSheet` component
- Share product URL with product name

**4.3 Add Share to Orders**
- Share order details (order number, status)
- Share order tracking link

### Phase 5: Product Ratings/Reviews

**5.1 Database Schema** (`src/lib/db/schema.ts`)
- Add `product_reviews` table:
  - `id`, `productId`, `userId`, `rating` (1-5), `comment`, `createdAt`
- Add `averageRating` computed field to products (or calculate on-the-fly)

**5.2 Review Component** (`src/components/customer/product/ProductReviews.tsx`)
- Display reviews with ratings
- "Write a review" button (only for delivered orders)
- Review form (rating + comment)

**5.3 Add Reviews to Product Sheet**
- Reviews section below product details
- Show average rating and review count
- List of reviews (paginated)

**5.4 Review API Route** (`src/app/api/products/[id]/reviews/route.ts`)
- GET: Fetch reviews for product
- POST: Create review (requires auth + delivered order)

### Phase 6: Pull to Refresh

**6.1 Pull to Refresh Hook** (`src/hooks/usePullToRefresh.ts`)
- Detect pull gesture on mobile
- Trigger refresh callback
- Show loading indicator

**6.2 Add to Pages**
- Home page: Refresh vendor list
- Orders page: Refresh orders
- Search page: Refresh results

### Phase 7: Better Empty States

**7.1 Empty State Components**
- `EmptyVendors` - "No partners found" with "Browse all" button
- `EmptyProducts` - "No products found" with filter suggestions
- `EmptySearchResults` - "No results" with search suggestions

**7.2 Update Existing Empty States**
- Add helpful CTAs
- Add illustrations/icons
- Match Swiggy's friendly tone

## Files to Create

### New Files:
1. `src/app/(auth)/layout.tsx` - Auth layout (no navbar)
2. `src/app/(auth)/login/page.tsx` - Login page
3. `src/app/(auth)/signup/page.tsx` - Signup page
4. `src/components/auth/PhoneInput.tsx` - Phone input component
5. `src/components/auth/OtpInput.tsx` - OTP input component
6. `src/components/auth/ProtectedRoute.tsx` - Route guard component
7. `src/components/layout/VendorNavbar.tsx` - Vendor navbar
8. `src/components/layout/VendorBottomNav.tsx` - Vendor bottom nav
9. `src/components/layout/AdminNavbar.tsx` - Admin navbar
10. `src/lib/services/otp.ts` - OTP sending/verification service
11. `src/components/sharing/ShareButton.tsx` - Share button component
12. `src/components/customer/product/ProductReviews.tsx` - Product reviews component
13. `src/hooks/usePullToRefresh.ts` - Pull to refresh hook
14. `src/components/empty/EmptyVendors.tsx` - Empty vendors state
15. `src/components/empty/EmptyProducts.tsx` - Empty products state
16. `src/app/api/auth/send-otp/route.ts` - Send OTP API
17. `src/app/api/auth/verify-otp/route.ts` - Verify OTP API
18. `src/app/api/products/[id]/reviews/route.ts` - Product reviews API

### Modify Files:
1. `src/app/(vendor)/layout.tsx` - Add VendorNavbar + VendorBottomNav
2. `src/app/(admin)/layout.tsx` - Add AdminNavbar
3. `src/lib/auth/config.ts` - Add Google OAuth provider
4. `src/middleware.ts` - Add protected route checks
5. `src/app/(customer)/orders/page.tsx` - Wrap with ProtectedRoute
6. `src/app/(customer)/profile/page.tsx` - Wrap with ProtectedRoute
7. `src/app/(customer)/cart/page.tsx` - Add auth check before checkout
8. `src/components/customer/partner/ProductSheet.tsx` - Add share button and reviews
9. `src/app/(customer)/page.tsx` - Add pull to refresh, use EmptyVendors
10. `src/app/(customer)/search/page.tsx` - Add pull to refresh, better empty states
11. `src/lib/db/schema.ts` - Add product_reviews table
12. `src/lib/config/env.ts` - Add OTP and OAuth env variables

## Key Decisions

**Auth Strategy:**
- ✅ Keep Better Auth (already configured with Supabase Postgres)
- ✅ Add custom phone/OTP flow (Better Auth doesn't have built-in phone provider)
- ✅ Use Better Auth's session management after OTP verification
- ✅ Add Google OAuth via Better Auth's social providers

**Navigation Strategy:**
- ✅ Add Navbar + BottomNav to ALL layouts (customer, vendor, admin)
- ✅ Consistent navigation pattern across all screens (Swiggy pattern)
- ✅ Role-specific nav items (customer vs vendor vs admin)

**Database:**
- ✅ Use existing Supabase Postgres (via DATABASE_URL)
- ✅ Use existing Drizzle ORM
- ✅ Add product_reviews table to existing schema

**No Reinvention:**
- ✅ Use existing Better Auth setup
- ✅ Use existing components (Navbar, BottomNav patterns)
- ✅ Use existing services (Razorpay for SMS)
- ✅ Follow Swiggy Dec 2025 patterns exactly

