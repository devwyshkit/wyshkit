# Supabase URL Configuration Guide

## Quick Setup Checklist

To get OTPs working and keep Cursor, localhost, and Supabase in sync, follow these steps:

## Step 1: Determine Your Local Port

First, check what port your Next.js app is running on:

```bash
# Check if your app is running
# Look at the terminal output when you run `npm run dev`
# It should show something like: "Local: http://localhost:3001"
```

**Common ports:**
- Default: `3000`
- If 3000 is busy: `3001`, `3002`, etc.
- Custom: Whatever you set with `PORT=3001 npm run dev`

## Step 2: Set Environment Variable

Add to your `.env.local` file:

```bash
# Replace 3001 with your actual port
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**Important**: Use the exact port your app is running on. If you're not sure, check your terminal output when starting the dev server.

## Step 3: Configure Supabase Dashboard

### 3.1 Navigate to URL Configuration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (check `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` for project ID)
3. Navigate to: **Authentication** → **URL Configuration**

**Direct Link Format:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/url-configuration
```

Replace `YOUR_PROJECT_ID` with your actual project ID (from `NEXT_PUBLIC_SUPABASE_URL`).

### 3.2 Configure Site URL

In the **Site URL** field, enter:
```
http://localhost:3001
```
(Replace `3001` with your actual port)

**What this does:**
- Used for email authentication redirects
- Used as the base URL for magic links
- Used as fallback for OAuth redirects

### 3.3 Configure Redirect URLs

In the **Redirect URLs** section, click **"Add URL"** and add each of these (one at a time):

1. **For Google OAuth (Server-side callback):**
   ```
   http://localhost:3001/api/auth/google/callback
   ```

2. **For Google OAuth (Client-side callback - handles fragment-based flow):**
   ```
   http://localhost:3001/auth/callback
   ```

3. **For Email Auth redirects:**
   ```
   http://localhost:3001
   ```

4. **Wildcard (if supported by Supabase):**
   ```
   http://localhost:3001/**
   ```

**Important Notes:**
- Replace `3001` with your actual port
- URLs must match **exactly** (including `http://` and port number)
- No trailing slashes (except for wildcard)
- Add each URL separately

### 3.4 Save Configuration

Click **"Save"** or **"Update"** button at the bottom of the page.

## Step 4: Configure Phone Provider (For OTP)

### 4.1 Navigate to Phone Provider

1. In Supabase Dashboard, go to: **Authentication** → **Providers**
2. Find and click on **Phone** provider

**Direct Link Format:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/providers
```

### 4.2 Enable Phone Provider

- Toggle **"Enable Phone provider"** to **ON** (green/enabled)
- Save if prompted

### 4.3 Configure Twilio SMS Provider

In the Phone provider settings, find the **"SMS Provider"** section:

1. **Select Provider**: Choose **"Twilio"** from the dropdown
2. **Enter Credentials** (from `.env.local`):
   ```
   Account SID: AC5b2755f3368b771901559de123e52dc9
   Auth Token: f6f786e32dea6ae866a2e3b6c6444bf3
   Verify Service SID: VA69cb929c1fdd05362cd009be8f8a3f90
   ```
3. **Click "Save"** or **"Update"** button
4. Wait for confirmation message

### 4.4 Verify Phone Provider Configuration

After saving, verify you see:
- ✅ **Phone provider** toggle is ON (green/enabled)
- ✅ **SMS Provider** shows "Twilio" (not "None" or empty)
- ✅ **Verify Service SID** is displayed: `VA69cb929c1fdd05362cd009be8f8a3f90`
- ✅ No error messages in red

## Step 5: Verify Environment Variables

Check that your `.env.local` has all required variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zvvglprouyrodqpwtwki.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App URL (IMPORTANT for OAuth)
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Twilio (for OTP via Supabase)
TWILIO_ACCOUNT_SID=AC5b2755f3368b771901559de123e52dc9
TWILIO_AUTH_TOKEN=f6f786e32dea6ae866a2e3b6c6444bf3
TWILIO_VERIFY_SERVICE_SID=VA69cb929c1fdd05362cd009be8f8a3f90

# Twilio (for WhatsApp messaging - optional)
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_WHATSAPP_CONTENT_SID=HXb5b62575e6e4ff6129ad7c8efe1f983e
```

## Step 6: Restart Your Development Server

After making changes to `.env.local` or Supabase Dashboard:

1. **Stop** your Next.js dev server (Ctrl+C)
2. **Restart** it:
   ```bash
   npm run dev
   ```

This ensures environment variables are reloaded.

## Step 7: Test OTP

### 7.1 Test via API

```bash
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919740803490"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully."
}
```

### 7.2 Test via UI

1. Go to `http://localhost:3001/login`
2. Enter phone number: `+919740803490`
3. Click "Send OTP"
4. Check your phone for SMS with OTP code
5. Enter OTP code
6. You should be logged in

## Troubleshooting

### OTP Not Received

1. **Check Supabase Dashboard → Logs → Auth**
   - Look for error messages
   - Check if Twilio API calls are being made

2. **Verify Twilio Configuration**
   - Go to Supabase Dashboard → Authentication → Providers → Phone
   - Ensure "Phone provider" is ON
   - Ensure "SMS Provider" shows "Twilio"
   - Verify credentials are correct

3. **Check Twilio Console**
   - Go to [Twilio Console](https://console.twilio.com/)
   - Check Verify Service is active
   - Check account balance
   - Check logs for failed SMS attempts

4. **Verify Phone Number Format**
   - Must be in E.164 format: `+919740803490`
   - Include country code (e.g., `+91` for India)
   - No spaces or dashes

5. **Check Environment Variables**
   ```bash
   # Verify variables are loaded
   curl http://localhost:3001/api/auth/otp-config
   ```
   This diagnostic endpoint shows configuration status.

### OAuth Not Working

1. **Check Redirect URLs**
   - Verify URLs in Supabase Dashboard match your app port exactly
   - Check browser console for redirect errors
   - Ensure `NEXT_PUBLIC_APP_URL` is set correctly

2. **Check Google OAuth Provider**
   - Go to Supabase Dashboard → Authentication → Providers → Google
   - Ensure "Enable Google provider" is ON
   - Verify Client ID and Secret are configured

### Port Mismatch Issues

If OTP works but OAuth doesn't:
- This confirms port mismatch
- Follow Step 2 and Step 3 above
- Restart dev server after changing `.env.local`

## Quick Reference

### Supabase Dashboard Links

Replace `YOUR_PROJECT_ID` with your project ID (from `NEXT_PUBLIC_SUPABASE_URL`):

- **URL Configuration**: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/url-configuration`
- **Phone Provider**: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/providers`
- **Google OAuth Provider**: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/providers`
- **Auth Logs**: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/logs/auth`

### Required Supabase Dashboard Settings

**URL Configuration:**
- Site URL: `http://localhost:3001` (your port)
- Redirect URLs:
  - `http://localhost:3001/api/auth/google/callback`
  - `http://localhost:3001/auth/callback`
  - `http://localhost:3001`

**Phone Provider:**
- Enable Phone provider: **ON**
- SMS Provider: **Twilio**
- Account SID: `AC5b2755f3368b771901559de123e52dc9`
- Auth Token: `f6f786e32dea6ae866a2e3b6c6444bf3`
- Verify Service SID: `VA69cb929c1fdd05362cd009be8f8a3f90`

## Summary

To get OTPs working:

1. ✅ Set `NEXT_PUBLIC_APP_URL=http://localhost:3001` in `.env.local` (use your port)
2. ✅ Configure Supabase Dashboard → Authentication → URL Configuration
3. ✅ Configure Supabase Dashboard → Authentication → Providers → Phone (enable Twilio)
4. ✅ Restart dev server
5. ✅ Test OTP sending

Once configured, OTPs will work automatically via Supabase's integration with Twilio.





