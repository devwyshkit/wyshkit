# Supabase Dashboard Configuration Guide

## ⚠️ CRITICAL: This is a REQUIRED Manual Step

**OTP will NOT work until Twilio is configured in Supabase Dashboard.** The code is ready, but Supabase Auth requires manual configuration in the dashboard.

## ⚠️ Port Mismatch Warning

**If your app runs on a different port than Supabase expects, OAuth and Email Auth will fail!**

- **Phone OTP (SMS)**: ✅ Not affected by port - works regardless
- **Google OAuth**: ❌ Will fail if port doesn't match Supabase redirect URLs
- **Email Auth**: ❌ Will fail if port doesn't match Supabase Site URL

**Solution**: 
1. Set `NEXT_PUBLIC_APP_URL=http://localhost:3001` in `.env.local` (use your actual port)
2. Configure Supabase Dashboard → Authentication → URL Configuration with the correct port (see below)

## Quick Setup Steps

### 1. Navigate to Phone Authentication Settings
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (check your `NEXT_PUBLIC_SUPABASE_URL` for project ID)
3. Navigate to: **Authentication** → **Providers**
4. Find and click on **Phone** provider

**Direct Link Format:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/providers
```

### 2. Enable Phone Provider
- Toggle **"Enable Phone provider"** to **ON** (this is critical!)
- The toggle should be green/enabled
- Save if prompted

### 3. Configure Twilio SMS Provider
In the Phone provider settings, find the **"SMS Provider"** section:

1. **Select Provider**: Choose **"Twilio"** from the dropdown (not "MessageBird" or others)
2. **Enter Credentials** (from `.env.local`):
   ```
   Account SID: AC5b2755f3368b771901559de123e52dc9
   Auth Token: f6f786e32dea6ae866a2e3b6c6444bf3
   Verify Service SID: VA69cb929c1fdd05362cd009be8f8a3f90
   ```
3. **Click "Save"** or **"Update"** button
4. Wait for confirmation message

### 4. Verify Configuration
After saving, verify you see:
- ✅ **Phone provider** toggle is ON (green/enabled)
- ✅ **SMS Provider** shows "Twilio" (not "None" or empty)
- ✅ **Verify Service SID** is displayed: `VA69cb929c1fdd05362cd009be8f8a3f90`
- ✅ No error messages in red

### 5. Configure Google OAuth Provider

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find and click on **Google** provider
3. Toggle **"Enable Google provider"** to **ON**
4. Configure OAuth credentials:
   - **Client ID (for OAuth)**: Get from [Google Cloud Console](https://console.cloud.google.com/)
   - **Client Secret (for OAuth)**: Get from Google Cloud Console
5. **Click "Save"** or **"Update"** button

**Direct Link Format:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/providers
```

**Note**: You need to create OAuth credentials in Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
7. Copy Client ID and Client Secret to Supabase Dashboard

### 6. Configure Redirect URLs (For OAuth & Email Auth)

**⚠️ IMPORTANT**: If your app runs on `localhost:3001` (or any port other than 3000), you MUST configure this:

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. In **Redirect URLs**, add:
   - `http://localhost:3001/api/auth/google/callback` (for Google OAuth - server-side callback)
   - `http://localhost:3001/auth/callback` (for Google OAuth - client-side callback, handles fragment-based flow)
   - `http://localhost:3001/**` (wildcard for all paths, if supported)
   - Or add specific paths you need
3. Update **Site URL** to match your app port:
   - If app runs on port 3001: `http://localhost:3001`
   - If app runs on port 3000: `http://localhost:3000`
   - This is used for email auth redirects

**Also set in `.env.local`:**
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3001
```
(Replace `3001` with your actual port)

### 7. Verify Row Level Security (RLS) Status

**✅ RLS is already enabled via migrations**, but you can verify in the dashboard:

1. Go to Supabase Dashboard → **Database** → **Tables**
2. Click on any table (e.g., `users`, `orders`, `products`)
3. Check that **"Row Level Security"** toggle is **ON** (green/enabled)
4. Click on **"Policies"** tab to view RLS policies
5. You should see policies like:
   - "Users can view own data"
   - "Customers can view own orders"
   - "Public can view active products"
   - etc.

**Note**: RLS policies are automatically created via database migrations. If you see tables without policies, run the migrations.

**For detailed RLS documentation**, see [SECURITY_SETUP.md](./SECURITY_SETUP.md)

### 8. Test OAuth

1. Go to your app's login page
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. You should be redirected back to your app and signed in
5. If you see `oauth_failed` error, check:
   - Redirect URLs in Supabase Dashboard match your app URL exactly
   - Google OAuth provider is enabled in Supabase Dashboard
   - Google OAuth credentials are correct
   - `NEXT_PUBLIC_APP_URL` is set correctly in `.env.local`

**Check OAuth Configuration:**
```bash
curl http://localhost:3001/api/auth/oauth-config
```

This endpoint shows:
- Expected redirect URLs
- Environment variable status
- Configuration recommendations

### 9. Test OTP
1. Use the test phone number: `+919740803490`
2. Or test via the application login flow at `/login`
3. Check that OTP is received via SMS
4. If you see "SMS provider not configured" error, the dashboard setup is incomplete

## Troubleshooting

### Error: "SMS provider not configured"
- **Cause**: Twilio not configured in Supabase Dashboard
- **Fix**: Complete steps 1-3 above

### Error: "Phone provider disabled"
- **Cause**: Phone provider toggle is OFF
- **Fix**: Enable Phone provider in step 2

### Error: "Invalid credentials"
- **Cause**: Twilio credentials are incorrect
- **Fix**: Verify credentials match `.env.local` exactly

### Error: "redirect_uri_mismatch" or OAuth fails
- **Cause**: Port mismatch - app runs on different port than Supabase expects, OR redirect URL not configured
- **Fix**: 
  1. Set `NEXT_PUBLIC_APP_URL=http://localhost:YOUR_PORT` in `.env.local`
  2. Add redirect URLs in Supabase Dashboard → Authentication → URL Configuration:
     - `http://localhost:YOUR_PORT/api/auth/google/callback` (server-side)
     - `http://localhost:YOUR_PORT/auth/callback` (client-side, for fragment-based flow)
  3. Update Site URL to match your port
  4. Verify Google OAuth provider is enabled in Supabase Dashboard
  5. Check OAuth credentials are correct

### Error: "oauth_failed" or tokens in URL fragment
- **Cause**: OAuth completed but callback failed, OR redirect URL mismatch causing fragment-based flow
- **Fix**:
  1. Check that redirect URLs match exactly (including port) in Supabase Dashboard
  2. Ensure both server-side (`/api/auth/google/callback`) and client-side (`/auth/callback`) URLs are configured
  3. The app now handles fragment-based flows automatically via `/auth/callback`
  4. Check server logs for detailed error messages
  5. Verify Google OAuth provider is enabled and configured correctly

### OTP not received
- Check Twilio account balance
- Verify phone number format: `+919740803490` (with country code)
- Check Supabase Dashboard → Logs → Auth for errors
- Verify Twilio Verify Service is active in Twilio Console
- **Note**: Port mismatch does NOT affect OTP (SMS) - it only affects OAuth and Email Auth

## Diagnostic Tools

### Check OAuth Configuration Status
Visit: `http://localhost:3001/api/auth/oauth-config`

This endpoint will show:
- Expected redirect URLs
- Environment variable status
- OAuth configuration recommendations
- Port mismatch warnings

### Check OTP Configuration Status
Visit: `http://localhost:3001/api/auth/otp-config`

This endpoint will show:
- Environment variables status
- Dashboard configuration status (if testable)
- Specific error messages
- Next steps

### Check Supabase Logs
1. Go to Supabase Dashboard → Logs → Auth
2. Look for errors when sending OTP
3. Common errors:
   - "SMS provider not configured"
   - "Phone provider disabled"
   - "Invalid Twilio credentials"

## Troubleshooting

### If OTP Still Doesn't Work

1. **Check Supabase Logs**:
   - Go to **Logs** → **Auth** in Supabase Dashboard
   - Look for errors related to SMS or Twilio

2. **Verify Twilio Credentials**:
   - Ensure Account SID and Auth Token are correct
   - Check Twilio Console for account status

3. **Check Twilio Verify Service**:
   - Go to [Twilio Console](https://console.twilio.com/) → Verify → Services
   - Verify Service SID: `VA69cb929c1fdd05362cd009be8f8a3f90`
   - Ensure service is active and has sufficient balance

4. **Test Phone Number Format**:
   - Must be in E.164 format: `+919740803490`
   - Include country code (+91 for India)

5. **Rate Limits**:
   - Check if Twilio rate limits are being hit
   - Verify account has sufficient credits

## Current Configuration Status

✅ **Environment Variables**: All Twilio credentials are configured in `.env.local`
✅ **Code**: Application code is ready to use Supabase phone auth and Google OAuth
✅ **OAuth Flow**: Supports both authorization code flow (server-side) and fragment-based flow (client-side)
✅ **RLS Security**: Row Level Security enabled on all tables with comprehensive policies
✅ **Performance**: Foreign key indexes added for optimal query performance
⏳ **Supabase Dashboard**: Needs manual configuration (steps above)

Once Supabase Dashboard is configured:
- **OTP** will work automatically with no code changes needed
- **Google OAuth** will work with proper redirect URL configuration

## Security & Performance

### Row Level Security (RLS)

All public tables have RLS enabled with comprehensive policies:
- ✅ Users can only access their own data
- ✅ Customers see their orders, vendors see their vendor orders
- ✅ Public can view active products and vendors
- ✅ Admins have full access
- ✅ Service role required for system operations (wallet updates, notifications)

**See [SECURITY_SETUP.md](./SECURITY_SETUP.md) for complete RLS documentation.**

### Performance Indexes

Foreign key indexes have been added for optimal query performance:
- ✅ All foreign keys are indexed
- ✅ Query performance optimized
- ✅ JOIN operations faster

### Configuration Health Check

Check your configuration status:
```bash
curl http://localhost:3000/api/health/config
```

This endpoint shows:
- RLS status for all tables
- Environment variable status
- Supabase connection status
- Configuration recommendations


