# Port Configuration Guide

## Problem

If your Next.js app runs on `localhost:3001` but Supabase Dashboard is configured for `localhost:3000`, OAuth and Email Auth will fail. **Phone OTP (SMS) is NOT affected** by port mismatch.

## Quick Fix

### Step 1: Set Environment Variable

Add to `.env.local`:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3001
```
(Replace `3001` with your actual port)

### Step 2: Configure Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: **Authentication** → **URL Configuration**
4. Add to **Redirect URLs**:
   - `http://localhost:3001/api/auth/google/callback`
   - `http://localhost:3001/**` (if wildcard supported)
5. Update **Site URL** to: `http://localhost:3001`

## What's Affected by Port Mismatch

| Feature | Affected? | Why |
|---------|-----------|-----|
| **Phone OTP (SMS)** | ❌ NO | SMS sent directly via Twilio, no redirect URLs |
| **Google OAuth** | ✅ YES | OAuth requires exact redirect URL match |
| **Email Auth** | ✅ YES | Email links use Site URL for redirects |
| **Magic Links** | ✅ YES | Uses Site URL for redirects |

## Verification

After configuration:

1. **Test OTP**: Should work regardless of port
   ```bash
   # Try sending OTP - should work
   curl -X POST http://localhost:3001/api/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"phone":"+919740803490"}'
   ```

2. **Test Google OAuth**: Should redirect correctly
   - Click "Sign in with Google" on login page
   - Should redirect back to `http://localhost:3001` after auth

3. **Check Configuration**:
   ```bash
   # Visit diagnostic endpoint
   curl http://localhost:3001/api/auth/otp-config
   ```

## Current Code Behavior

The code automatically uses:
1. `NEXT_PUBLIC_APP_URL` from `.env.local` (if set)
2. `window.location.origin` as fallback (detects current port automatically)

So if you set `NEXT_PUBLIC_APP_URL`, it will use that. Otherwise, it uses the actual port the app is running on.

## Common Ports

- **Next.js default**: `3000`
- **If port 3000 is busy**: Next.js uses `3001`, `3002`, etc.
- **Custom port**: Set via `npm run dev -- -p 3001` or `PORT=3001 npm run dev`

## Troubleshooting

### OAuth redirect fails
- Check Supabase Dashboard → Authentication → URL Configuration
- Verify redirect URL matches exactly (including port)
- Check browser console for redirect errors

### Email links don't work
- Verify Site URL in Supabase Dashboard matches your app port
- Check email template uses correct redirect URL

### OTP works but OAuth doesn't
- This confirms port mismatch is the issue
- Follow Step 1 and Step 2 above





