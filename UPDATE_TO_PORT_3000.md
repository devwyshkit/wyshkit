# Update Configuration from Port 3001 to 3000

## Quick Changes Required

### 1. Add to `.env.local`

Add this line to your `.env.local` file:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**If it already exists with `3001`, change it to `3000`.**

### 2. Update Supabase Dashboard URL Configuration

**Go to**: https://supabase.com/dashboard/project/zvvglprouyrodqpwtwki/auth/url-configuration

#### A. Update Site URL

**Change from:**
```
http://localhost:3001
```

**Change to:**
```
http://localhost:3000
```

#### B. Update Redirect URLs

**Remove these old URLs** (if they exist):
- `http://localhost:3001/api/auth/google/callback`
- `http://localhost:3001/auth/callback`
- `http://localhost:3001`
- `http://localhost:3001/**`

**Add these new URLs** (click "Add URL" for each):

1. `http://localhost:3000/api/auth/google/callback`
2. `http://localhost:3000/auth/callback`
3. `http://localhost:3000`
4. `http://localhost:3000/**` (optional, if wildcard supported)

**Click "Save"** at the bottom.

## Final Configuration

### Site URL
```
http://localhost:3000
```

### Redirect URLs (All should be port 3000)
```
http://localhost:3000/api/auth/google/callback
http://localhost:3000/auth/callback
http://localhost:3000
http://localhost:3000/**
```

## After Making Changes

1. **Restart dev server** (if you changed `.env.local`):
   ```bash
   # Stop (Ctrl+C) and restart
   npm run dev
   ```

2. **Test OAuth**:
   - Visit: `http://localhost:3000/login`
   - Click "Sign in with Google"
   - Should redirect back to port 3000

3. **Test OTP** (not affected by port):
   - Visit: `http://localhost:3000/login`
   - Enter phone: `+919740803490`
   - Should receive OTP

## Summary

**What Changed:**
- Port: `3001` → `3000`
- Site URL: `http://localhost:3001` → `http://localhost:3000`
- All Redirect URLs: `3001` → `3000`

**What Stays the Same:**
- Phone Provider configuration (not affected by port)
- Twilio credentials (not affected by port)
- OTP functionality (works on any port)

That's it! Once you update the Supabase Dashboard, everything will work on port 3000.




