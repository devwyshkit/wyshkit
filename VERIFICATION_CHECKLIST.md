# Configuration Verification Checklist

## ✅ Server Status
- **Status**: Dev server is running
- **Port**: Check terminal output or visit `http://localhost:3000` or `http://localhost:3001`

## ✅ Code Configuration Status

### Environment Variables Check

Run this to check your configuration:
```bash
curl http://localhost:3000/api/auth/otp-config
# or
curl http://localhost:3001/api/auth/otp-config
```

**Required Variables (for OTP):**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Set
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Set
- ✅ `TWILIO_ACCOUNT_SID` - Set
- ✅ `TWILIO_AUTH_TOKEN` - Set
- ✅ `TWILIO_VERIFY_SERVICE_SID` - Set

**Recommended Variables (for OAuth):**
- ⚠️ `NEXT_PUBLIC_APP_URL` - **NOT SET** (add this!)
  - Add to `.env.local`: `NEXT_PUBLIC_APP_URL=http://localhost:3000` (or your port)

**Optional Variables (for WhatsApp):**
- ⚠️ `TWILIO_WHATSAPP_NUMBER` - Not set (optional, for WhatsApp messaging)
- ⚠️ `TWILIO_WHATSAPP_CONTENT_SID` - Not set (optional, for WhatsApp messaging)
- ⚠️ `TWILIO_MESSAGE_SERVICE_SID` - Not set (optional, for SMS messaging)

## ⚠️ Supabase Dashboard Configuration Required

### 1. URL Configuration
**Go to**: Supabase Dashboard → Authentication → URL Configuration

**Set:**
- **Site URL**: `http://localhost:3000` (or your port)
- **Redirect URLs** (add each):
  1. `http://localhost:3000/api/auth/google/callback`
  2. `http://localhost:3000/auth/callback`
  3. `http://localhost:3000`

### 2. Phone Provider Configuration
**Go to**: Supabase Dashboard → Authentication → Providers → Phone

**Configure:**
- ✅ **Enable Phone provider**: Toggle ON
- ✅ **SMS Provider**: Select "Twilio"
- ✅ **Account SID**: `AC5b2755f3368b771901559de123e52dc9`
- ✅ **Auth Token**: `f6f786e32dea6ae866a2e3b6c6444bf3`
- ✅ **Verify Service SID**: `VA69cb929c1fdd05362cd009be8f8a3f90`
- ✅ **Click "Save"**

## 🔍 Diagnostic Endpoints

### Check OTP Configuration
```bash
curl http://localhost:3000/api/auth/otp-config
```

### Check Overall Health
```bash
curl http://localhost:3000/api/health/config
```

### Check Supabase Connection
```bash
curl http://localhost:3000/api/health/supabase
```

## 🧪 Test OTP

### Via API
```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919740803490"}'
```

### Via UI
1. Visit: `http://localhost:3000/login`
2. Enter phone: `+919740803490`
3. Click "Send OTP"
4. Check phone for SMS

## ❌ Common Issues

### Issue: "Invalid From Number" Error
**Error**: `Invalid From Number (caller ID): VA69cb929c1fdd05362cd009be8f8a3f90`

**Solution**: 
- This error means Twilio credentials are not properly configured in Supabase Dashboard
- Go to Supabase Dashboard → Authentication → Providers → Phone
- Ensure "Phone provider" is enabled
- Ensure "Twilio" is selected as SMS provider
- Re-enter and save Twilio credentials

### Issue: OTP Not Received
**Check:**
1. Supabase Dashboard → Logs → Auth (look for errors)
2. Twilio Console → Verify → Services (check service is active)
3. Phone number format (must be E.164: `+919740803490`)

### Issue: OAuth Not Working
**Check:**
1. `NEXT_PUBLIC_APP_URL` is set in `.env.local`
2. Redirect URLs in Supabase Dashboard match your port exactly
3. Google OAuth provider is enabled in Supabase Dashboard

## 📋 Quick Fix Checklist

If OTP is not working:

1. ✅ **Code is ready** (verified via `/api/auth/otp-config`)
2. ⚠️ **Add to `.env.local`**:
   ```bash
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   (Replace `3000` with your actual port)

3. ⚠️ **Configure Supabase Dashboard**:
   - URL Configuration: Set Site URL and Redirect URLs
   - Phone Provider: Enable and configure Twilio

4. ✅ **Restart dev server** (already done)

5. 🧪 **Test OTP**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"phone":"+919740803490"}'
   ```

## Current Status Summary

✅ **Code**: All environment variables are set correctly
✅ **Server**: Dev server is running
⚠️ **Supabase Dashboard**: Needs manual configuration (URL Configuration + Phone Provider)
⚠️ **Environment**: `NEXT_PUBLIC_APP_URL` should be added for OAuth to work

**Next Step**: Configure Supabase Dashboard as shown above, then test OTP.





