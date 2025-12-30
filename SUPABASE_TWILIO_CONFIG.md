# Supabase Twilio Configuration Guide

## Overview
This document explains how to configure Supabase to use Twilio as the SMS provider for phone OTP authentication, and how to use Twilio for WhatsApp messaging.

## Twilio Credentials

The following Twilio credentials are configured in `.env.local`:

### Authentication & Core Services
- **Account SID**: `AC5b2755f3368b771901559de123e52dc9`
- **Auth Token**: `f6f786e32dea6ae866a2e3b6c6444bf3`
- **API Key SID**: `SK84935b7b5e89b32e43ab245902bde808` (for API access if needed)

### OTP & SMS Services
- **Verify Service SID**: `VA69cb929c1fdd05362cd009be8f8a3f90` (for OTP verification via Supabase)
- **Message Service SID**: `MG7097b0bfd0cf1c72f73a9ffa073f9525` (for SMS messaging)

### WhatsApp Services
- **WhatsApp Number**: `whatsapp:+14155238886` (WhatsApp sender number)
- **WhatsApp Content SID**: `HXb5b62575e6e4ff6129ad7c8efe1f983e` (WhatsApp Content Template SID for message templates)
  - **Note**: This is a Content Template SID, not a Service SID. It's used with Twilio's Content API for WhatsApp message templates.

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

### OTP Authentication (via Supabase)

No code changes are required. The existing Supabase auth flow will automatically use Twilio once configured:

- `supabase.auth.signInWithOtp({ phone, options: { channel: 'sms' } })` - Will use Twilio Verify
- `supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' })` - Will verify via Twilio

### WhatsApp Messaging (Direct Twilio API)

For sending WhatsApp messages (order updates, notifications, etc.), use the Twilio messaging service:

```typescript
import { sendWhatsAppMessage } from "@/lib/services/twilio";

// Send WhatsApp message with content template
const result = await sendWhatsAppMessage(
  "+919740803490", // Recipient phone number (E.164 format)
  "HXb5b62575e6e4ff6129ad7c8efe1f983e", // Content Template SID
  {
    "1": "12/1", // Template variable 1
    "2": "3pm"   // Template variable 2
  }
);

if (result.success) {
  console.log("Message sent:", result.messageSid);
} else {
  console.error("Failed to send:", result.error);
}
```

### SMS Messaging (Direct Twilio API)

For sending SMS messages directly (not via Supabase OTP):

```typescript
import { sendSMS } from "@/lib/services/twilio";

// Send SMS message
const result = await sendSMS(
  "+919740803490", // Recipient phone number (E.164 format)
  "Your order has been confirmed!" // Message body
);

if (result.success) {
  console.log("SMS sent:", result.messageSid);
} else {
  console.error("Failed to send:", result.error);
}
```

## Troubleshooting

If OTP is still not working after configuration:

1. **Check Supabase Logs**: Go to Supabase Dashboard → Logs → Auth
2. **Verify Twilio Credentials**: Ensure Account SID and Auth Token are correct
3. **Check Twilio Console**: Verify the Verify Service is active and has sufficient balance
4. **Test Phone Number**: Ensure the phone number is in E.164 format (+91XXXXXXXXXX)
5. **Rate Limits**: Check if Twilio rate limits are being hit

## Environment Variables

### Required for OTP (via Supabase)
These credentials are stored in `.env.local` for reference but are primarily configured in Supabase Dashboard. The Supabase dashboard configuration takes precedence for OTP:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

### Required for WhatsApp Messaging
These must be set in `.env.local` for direct WhatsApp messaging:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER` (e.g., `whatsapp:+14155238886`)
- `TWILIO_WHATSAPP_CONTENT_SID` (Content Template SID, e.g., `HXb5b62575e6e4ff6129ad7c8efe1f983e`)

### Optional for SMS Messaging
- `TWILIO_MESSAGE_SERVICE_SID` (for direct SMS messaging via Twilio API)

## WhatsApp Content Templates

The WhatsApp Content Template SID (`TWILIO_WHATSAPP_CONTENT_SID`) must be configured in Twilio Console:
1. Go to Twilio Console → Content → Templates
2. Create or select a WhatsApp message template
3. Copy the Content SID (starts with `HX`)
4. Add it to `.env.local` as `TWILIO_WHATSAPP_CONTENT_SID`

**Important**: WhatsApp templates must be approved by WhatsApp before they can be used. Templates are typically approved within 24-48 hours.

