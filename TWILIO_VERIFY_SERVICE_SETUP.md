# Twilio Verify Service Setup Guide

## Your Verify Service SID
```
VA69cb929c1fdd05362cd009be8f8a3f90
```

## Quick Setup Steps

### 1. Add to `.env.local`

Make sure this line is in your `.env.local` file:

```bash
TWILIO_VERIFY_SERVICE_SID=VA69cb929c1fdd05362cd009be8f8a3f90
```

### 2. Configure in Supabase Dashboard (REQUIRED)

**This is the most important step!** OTP will NOT work until this is configured.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `zvvglprouyrodqpwtwki`
3. Navigate to: **Authentication** → **Providers** → **Phone**

**Direct Link:**
```
https://supabase.com/dashboard/project/zvvglprouyrodqpwtwki/auth/providers
```

4. **Enable Phone Provider:**
   - Toggle **"Enable Phone provider"** to **ON** ✅

5. **Configure Twilio:**
   - **SMS Provider**: Select **"Twilio"**
   - **Account SID**: `AC5b2755f3368b771901559de123e52dc9`
   - **Auth Token**: `f6f786e32dea6ae866a2e3b6c6444bf3`
   - **Verify Service SID**: `VA69cb929c1fdd05362cd009be8f8a3f90` ⬅️ **YOUR NEW SERVICE**
   - Click **"Save"**

6. **Verify Configuration:**
   - ✅ Phone provider toggle is ON
   - ✅ SMS Provider shows "Twilio"
   - ✅ Verify Service SID is displayed: `VA69cb929c1fdd05362cd009be8f8a3f90`

### 3. Restart Dev Server

After updating `.env.local`:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### 4. Test OTP

1. Go to `http://localhost:3000/login`
2. Enter phone: `+919740803490`
3. Click "Send OTP"
4. Check your phone for SMS

## Troubleshooting

### Error 21212: Invalid Phone Number

If you still get error 21212 after configuration:

1. **Check Supabase Dashboard:**
   - Verify Service SID must match exactly: `VA69cb929c1fdd05362cd009be8f8a3f90`
   - No extra spaces or characters

2. **Check Twilio Console:**
   - Go to [Twilio Console](https://console.twilio.com/)
   - Navigate to **Verify** → **Services**
   - Verify the Service SID `VA69cb929c1fdd05362cd009be8f8a3f90` exists and is active

3. **Trial Account Restriction:**
   - If using Twilio trial account, verify the phone number first:
   - Twilio Console → Phone Numbers → Verified Caller IDs
   - Add `+919740803490` as verified number

4. **Check Server Logs:**
   - Look for: `[Send OTP] Normalized phone number`
   - Should show: `+919740803490` (12 digits after +91)

5. **Check Supabase Logs:**
   - Supabase Dashboard → Logs → Auth
   - Look for error messages related to Twilio

## Verification Checklist

- [ ] `TWILIO_VERIFY_SERVICE_SID=VA69cb929c1fdd05362cd009be8f8a3f90` in `.env.local`
- [ ] Supabase Dashboard → Phone provider is ON
- [ ] Supabase Dashboard → SMS Provider shows "Twilio"
- [ ] Supabase Dashboard → Verify Service SID matches: `VA69cb929c1fdd05362cd009be8f8a3f90`
- [ ] Dev server restarted after `.env.local` changes
- [ ] Twilio Console → Verify Service exists and is active
- [ ] Phone number verified in Twilio (if trial account)

## Quick Test Command

```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
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

## Need Help?

1. Check diagnostic endpoint: `http://localhost:3000/api/auth/otp-config`
2. Check Supabase health: `http://localhost:3000/api/health/supabase`
3. Review full guide: `SUPABASE_DASHBOARD_SETUP.md`





