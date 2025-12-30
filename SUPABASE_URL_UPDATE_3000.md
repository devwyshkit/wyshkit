# Supabase URL Configuration Update - Port 3000

## Quick Update Guide

Since your app is now running on port **3000** (instead of 3001), update your Supabase Dashboard configuration.

## Step 1: Update Environment Variable

**In `.env.local`**, ensure you have:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If it was set to `3001`, change it to `3000`.

## Step 2: Update Supabase Dashboard URL Configuration

### Navigate to URL Configuration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **zvvglprouyrodqpwtwki**
3. Navigate to: **Authentication** → **URL Configuration**

**Direct Link:**
```
https://supabase.com/dashboard/project/zvvglprouyrodqpwtwki/auth/url-configuration
```

### Update Site URL

**Change from:**
```
http://localhost:3001
```

**Change to:**
```
http://localhost:3000
```

### Update Redirect URLs

**Remove old URLs (if they exist):**
- ❌ `http://localhost:3001/api/auth/google/callback`
- ❌ `http://localhost:3001/auth/callback`
- ❌ `http://localhost:3001`
- ❌ `http://localhost:3001/**`

**Add new URLs (for port 3000):**

Click **"Add URL"** and add each of these **one at a time**:

1. **Google OAuth Server-side Callback:**
   ```
   http://localhost:3000/api/auth/google/callback
   ```

2. **Google OAuth Client-side Callback:**
   ```
   http://localhost:3000/auth/callback
   ```

3. **Base URL (for Email Auth):**
   ```
   http://localhost:3000
   ```

4. **Wildcard (if supported):**
   ```
   http://localhost:3000/**
   ```

### Save Configuration

Click **"Save"** or **"Update"** button at the bottom.

## Step 3: Verify Configuration

After saving, verify you see:
- ✅ **Site URL**: `http://localhost:3000`
- ✅ **Redirect URLs** list contains:
  - `http://localhost:3000/api/auth/google/callback`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000`
  - (Optional) `http://localhost:3000/**`

## Step 4: Restart Dev Server (If Needed)

If you changed `.env.local`, restart your dev server:

```bash
# Stop server (Ctrl+C)
# Then restart
npm run dev
```

## Complete Configuration Summary

### Site URL
```
http://localhost:3000
```

### Redirect URLs (Add All)
```
http://localhost:3000/api/auth/google/callback
http://localhost:3000/auth/callback
http://localhost:3000
http://localhost:3000/**
```

## What This Fixes

- ✅ **Google OAuth** will redirect correctly to port 3000
- ✅ **Email Auth** links will point to port 3000
- ✅ **Magic Links** will work with port 3000
- ✅ **OAuth callbacks** will be handled correctly

## Testing

After updating:

1. **Test OAuth**:
   - Go to `http://localhost:3000/login`
   - Click "Sign in with Google"
   - Should redirect back to `http://localhost:3000` after auth

2. **Test OTP** (not affected by port):
   - Go to `http://localhost:3000/login`
   - Enter phone: `+919740803490`
   - Click "Send OTP"
   - Should receive SMS

3. **Check Configuration**:
   ```bash
   curl http://localhost:3000/api/auth/otp-config
   ```

## Important Notes

- **Phone OTP (SMS)**: NOT affected by port changes - works regardless
- **OAuth & Email Auth**: REQUIRES exact port match in Supabase Dashboard
- **Old URLs**: You can keep both 3000 and 3001 URLs if you switch ports frequently, but it's cleaner to remove old ones

## Troubleshooting

### OAuth Still Redirecting to 3001

1. **Clear browser cache** and cookies
2. **Verify** `.env.local` has `NEXT_PUBLIC_APP_URL=http://localhost:3000`
3. **Check** Supabase Dashboard → URL Configuration shows port 3000
4. **Restart** dev server after changing `.env.local`

### Redirect URL Mismatch Error

- Ensure URLs in Supabase Dashboard match **exactly** (including `http://` and port)
- No trailing slashes (except for wildcard)
- Check browser console for exact redirect URL being used

## Quick Checklist

- [ ] Updated `.env.local` with `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- [ ] Updated Supabase Dashboard → Site URL to `http://localhost:3000`
- [ ] Removed old port 3001 URLs from Redirect URLs
- [ ] Added new port 3000 URLs to Redirect URLs
- [ ] Saved configuration in Supabase Dashboard
- [ ] Restarted dev server (if `.env.local` was changed)
- [ ] Tested OAuth login
- [ ] Tested OTP login





