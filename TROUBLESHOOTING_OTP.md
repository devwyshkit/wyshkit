# OTP Delivery Troubleshooting Guide

## Problem: OTP Requests Succeed But SMS Not Received

If Supabase returns status 200 (success) but you're not receiving SMS messages, this guide will help you diagnose and fix the issue.

## Quick Diagnostic Steps

### Step 1: Check Twilio Account Status

Run the diagnostic endpoint:

```bash
curl http://localhost:3000/api/auth/twilio-status
```

This will check:
- Twilio credentials in environment
- Twilio account status (active/suspended/closed)
- Account balance
- Verify Service existence and status

### Step 2: Check Supabase Logs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **Logs** → **Auth**
3. Look for errors related to:
   - `sms_send_failed`
   - `Invalid From Number`
   - `21212` (Twilio error code)
   - `20404` (Verify Service not found)

### Step 3: Check Twilio Console

1. Go to [Twilio Console](https://console.twilio.com)
2. Check **Account** → **Settings**:
   - Account status should be "Active"
   - Account should have credits/balance
3. Check **Verify** → **Services**:
   - Verify Service should exist and be active
   - Service SID should match `TWILIO_VERIFY_SERVICE_SID` in `.env.local`
   - Service SID should match Supabase Dashboard configuration

## Common Issues and Solutions

### Issue 1: Twilio Error 21212 - "Invalid From Number"

**Symptoms:**
- Supabase logs show: `Invalid From Number (caller ID): VA69cb929c1fdd05362cd009be8f8a3f90`
- Error code: `sms_send_failed`

**Root Cause:**
The Verify Service SID is being used incorrectly as a "From" number. This happens when:
- Verify Service SID is misconfigured in Supabase Dashboard
- Verify Service has been deleted or disabled
- Wrong Service SID is configured

**Solution:**
1. Go to Twilio Console → Verify → Services
2. Find your active Verify Service
3. Copy the Service SID (starts with `VA`)
4. Go to Supabase Dashboard → Authentication → Providers → Phone
5. Ensure "Twilio" is selected as SMS provider
6. Enter Verify Service SID in the correct field (not as "From" number)
7. Save configuration
8. Test OTP again

### Issue 2: Twilio Account Balance Depleted

**Symptoms:**
- OTP requests succeed but SMS not delivered
- No errors in Supabase logs
- Twilio Console shows $0.00 balance

**Solution:**
1. Go to Twilio Console → Billing
2. Add credits to your account
3. Wait a few minutes for balance to update
4. Test OTP again

### Issue 3: Verify Service Not Found (Error 20404)

**Symptoms:**
- Supabase logs show: `The requested resource /v2/Services/VA... was not found`
- Error code: `sms_send_failed`

**Root Cause:**
- Verify Service SID is incorrect
- Verify Service has been deleted
- Service SID mismatch between `.env.local` and Supabase Dashboard

**Solution:**
1. Go to Twilio Console → Verify → Services
2. If no service exists, create a new Verify Service
3. Copy the Service SID
4. Update `.env.local`:
   ```bash
   TWILIO_VERIFY_SERVICE_SID=VA...your-service-sid...
   ```
5. Update Supabase Dashboard → Authentication → Providers → Phone
6. Enter the same Service SID
7. Save and test

### Issue 4: Supabase Dashboard Not Configured

**Symptoms:**
- Error code: `SMS_NOT_CONFIGURED`
- Error message: "SMS service is not configured"

**Solution:**
1. Go to Supabase Dashboard → Authentication → Providers → Phone
2. Enable "Phone provider" (toggle ON)
3. Select "Twilio" as SMS provider
4. Enter Twilio credentials:
   - Account SID: `AC...` (from Twilio Console)
   - Auth Token: `...` (from Twilio Console)
   - Verify Service SID: `VA...` (from Twilio Console)
5. Save configuration
6. Test OTP

### Issue 5: Silent Failures (Status 200 but No SMS)

**Symptoms:**
- API returns `{ success: true }`
- No SMS received
- No errors in logs

**Possible Causes:**
1. Twilio account suspended (check Twilio Console → Account → Settings)
2. Phone number carrier blocking (try different phone number)
3. Rate limiting (wait a few minutes and retry)
4. Verify Service disabled (check Twilio Console → Verify → Services)

**Diagnosis:**
1. Run diagnostic endpoint: `curl http://localhost:3000/api/auth/twilio-status`
2. Check Twilio Console → Monitor → Logs for delivery attempts
3. Check Supabase Dashboard → Logs → Auth for hidden errors

**Solution:**
Based on diagnostic results:
- If account suspended: Contact Twilio support
- If carrier blocking: Use a different phone number or contact Twilio support
- If rate limiting: Wait and retry
- If service disabled: Enable Verify Service in Twilio Console

## Environment Variables Checklist

Ensure these are set in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Twilio (for reference - actual config is in Supabase Dashboard)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...
```

**Important:** Twilio credentials must be configured in **both**:
1. `.env.local` (for reference/diagnostics)
2. Supabase Dashboard → Authentication → Providers → Phone (for actual OTP delivery)

## Verification Checklist

After configuration, verify:

- [ ] Twilio account is active (Twilio Console → Account → Settings)
- [ ] Twilio account has credits (Twilio Console → Billing)
- [ ] Verify Service exists and is active (Twilio Console → Verify → Services)
- [ ] Verify Service SID matches `.env.local` and Supabase Dashboard
- [ ] Supabase Dashboard → Authentication → Providers → Phone is enabled
- [ ] Twilio credentials are entered in Supabase Dashboard
- [ ] Phone number is in E.164 format: `+919740803490`
- [ ] No errors in Supabase Dashboard → Logs → Auth
- [ ] Diagnostic endpoint returns `"status": "ok"`

## Testing OTP

### Via API

```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919740803490"}'
```

### Via UI

1. Visit: `http://localhost:3000/login`
2. Enter phone number: `+919740803490`
3. Click "Send OTP"
4. Check phone for SMS

## Diagnostic Endpoints

### Check OTP Configuration

```bash
curl http://localhost:3000/api/auth/otp-config
```

### Check Twilio Status

```bash
curl http://localhost:3000/api/auth/twilio-status
```

### Check Supabase Health

```bash
curl http://localhost:3000/api/health/supabase
```

## Still Not Working?

If OTP still fails after following this guide:

1. **Check Twilio Console → Monitor → Logs**
   - Look for delivery attempts
   - Check error codes and messages

2. **Check Supabase Dashboard → Logs → Auth**
   - Look for `sms_send_failed` errors
   - Check for rate limiting errors

3. **Verify Phone Number**
   - Ensure it's in E.164 format: `+[country code][number]`
   - Try a different phone number to rule out carrier blocking

4. **Contact Support**
   - Twilio Support: https://support.twilio.com
   - Supabase Support: https://supabase.com/support

## Error Code Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `SMS_NOT_CONFIGURED` | Twilio not configured in Supabase Dashboard | Configure in Dashboard → Authentication → Providers → Phone |
| `SMS_SEND_FAILED` | SMS delivery failed | Check Twilio account balance, Verify Service status |
| `RATE_LIMIT` | Too many requests | Wait a few minutes and retry |
| `INVALID_PHONE` | Phone number format incorrect | Use E.164 format: `+919740803490` |
| `21212` | Invalid From Number (Twilio) | Check Verify Service SID configuration |
| `20404` | Verify Service not found (Twilio) | Verify Service SID is incorrect or service deleted |

## Additional Resources

- [Twilio Verify Documentation](https://www.twilio.com/docs/verify)
- [Supabase Phone Auth Documentation](https://supabase.com/docs/guides/auth/phone-login)
- [Twilio Error Codes](https://www.twilio.com/docs/api/errors)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)




