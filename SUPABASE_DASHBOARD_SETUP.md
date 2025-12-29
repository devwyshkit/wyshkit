# Supabase Dashboard Configuration Guide

## Quick Setup Steps

### 1. Navigate to Phone Authentication Settings
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **cugeeyffksxnbuwbwmpn**
3. Navigate to: **Authentication** → **Providers**
4. Find and click on **Phone** provider

### 2. Enable Phone Provider
- Toggle **Enable Phone provider** to ON
- Save if prompted

### 3. Configure Twilio SMS Provider
In the Phone provider settings, find the **SMS Provider** section:

1. **Select Provider**: Choose **Twilio** from the dropdown
2. **Enter Credentials**:
   ```
   Account SID: AC5b2755f3368b771901559de123e52dc9
   Auth Token: f6f786e32dea6ae866a2e3b6c6444bf3
   Verify Service SID: VA69cb929c1fdd05362cd009be8f8a3f90
   ```
3. **Save Configuration**

### 4. Verify Configuration
After saving, you should see:
- ✅ Phone provider enabled
- ✅ Twilio configured as SMS provider
- ✅ Verify Service SID displayed

### 5. Test OTP
1. Use the test phone number: `+919740803490`
2. Or test via the application login flow
3. Check that OTP is received via SMS

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
✅ **Code**: Application code is ready to use Supabase phone auth
⏳ **Supabase Dashboard**: Needs manual configuration (steps above)

Once Supabase Dashboard is configured, OTP will work automatically with no code changes needed.


