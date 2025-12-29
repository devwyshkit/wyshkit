# Supabase Twilio Configuration Guide

## Overview
This document explains how to configure Supabase to use Twilio as the SMS provider for phone OTP authentication.

## Twilio Credentials

The following Twilio credentials are configured in `.env.local`:

- **Account SID**: `AC5b2755f3368b771901559de123e52dc9`
- **Auth Token**: `f6f786e32dea6ae866a2e3b6c6444bf3`
- **WyshKit API Key SID**: `SK84935b7b5e89b32e43ab245902bde808` (for API access if needed)
- **Verify Service SID**: `VA69cb929c1fdd05362cd009be8f8a3f90` (for OTP verification)
- **Message Service SID**: `MG7097b0bfd0cf1c72f73a9ffa073f9525` (for SMS messaging)
- **WhatsApp Service SID**: `HXb5b62575e6e4ff6129ad7c8efe1f983e` (for WhatsApp messaging)

## Supabase Dashboard Configuration

**⚠️ IMPORTANT**: This is a **manual step** that must be completed in the Supabase Dashboard for OTP to work.

See **[SUPABASE_DASHBOARD_SETUP.md](./SUPABASE_DASHBOARD_SETUP.md)** for detailed step-by-step instructions.

### Quick Steps:
1. Go to Supabase Dashboard → Authentication → Providers → Phone
2. Enable Phone provider
3. Select **Twilio** as SMS provider
4. Enter credentials:
   - **Account SID**: `AC5b2755f3368b771901559de123e52dc9`
   - **Auth Token**: `f6f786e32dea6ae866a2e3b6c6444bf3`
   - **Verify Service SID**: `VA69cb929c1fdd05362cd009be8f8a3f90`
5. Save configuration
6. Test with phone number: `+919740803490`

## Important Notes

✅ **Credentials Verified**: All Twilio credentials have been verified and updated.

## Code Integration

No code changes are required. The existing Supabase auth flow will automatically use Twilio once configured:

- `supabase.auth.signInWithOtp({ phone, options: { channel: 'sms' } })` - Will use Twilio Verify
- `supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' })` - Will verify via Twilio

## Troubleshooting

If OTP is still not working after configuration:

1. **Check Supabase Logs**: Go to Supabase Dashboard → Logs → Auth
2. **Verify Twilio Credentials**: Ensure Account SID and Auth Token are correct
3. **Check Twilio Console**: Verify the Verify Service is active and has sufficient balance
4. **Test Phone Number**: Ensure the phone number is in E.164 format (+91XXXXXXXXXX)
5. **Rate Limits**: Check if Twilio rate limits are being hit

## Environment Variables

These credentials are stored in `.env.local` for reference but are primarily configured in Supabase Dashboard. The Supabase dashboard configuration takes precedence.

