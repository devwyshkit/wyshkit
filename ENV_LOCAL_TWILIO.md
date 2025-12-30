# Twilio Environment Variables for .env.local

This document lists all Twilio-related environment variables that should be added to `.env.local`.

## Required Variables

### Core Twilio Credentials
```bash
# Twilio Account Credentials
TWILIO_ACCOUNT_SID=AC5b2755f3368b771901559de123e52dc9
TWILIO_AUTH_TOKEN=f6f786e32dea6ae866a2e3b6c6444bf3
```

### OTP Authentication (via Supabase)
```bash
# Twilio Verify Service for OTP (used by Supabase)
TWILIO_VERIFY_SERVICE_SID=VA69cb929c1fdd05362cd009be8f8a3f90
```

**Note**: These credentials must also be configured in Supabase Dashboard → Authentication → Providers → Phone for OTP to work.

### WhatsApp Messaging
```bash
# WhatsApp sender number (must include whatsapp: prefix)
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# WhatsApp Content Template SID (for message templates)
TWILIO_WHATSAPP_CONTENT_SID=HXb5b62575e6e4ff6129ad7c8efe1f983e
```

**Important**: 
- `TWILIO_WHATSAPP_CONTENT_SID` is a Content Template SID (starts with `HX`), not a Service SID
- WhatsApp templates must be approved by WhatsApp in Twilio Console before use
- The Content Template must match the variables you pass in your code

### SMS Messaging (Optional - for direct SMS via Twilio API)
```bash
# Twilio Messaging Service for SMS (optional, for direct SMS messaging)
TWILIO_MESSAGE_SERVICE_SID=MG7097b0bfd0cf1c72f73a9ffa073f9525
```

### Additional (Optional)
```bash
# Twilio API Key SID (for API access if needed)
TWILIO_API_KEY_SID=SK84935b7b5e89b32e43ab245902bde808

# Twilio Phone Number (if using phone number instead of Messaging Service)
TWILIO_PHONE_NUMBER=+14155238886
```

## Complete Example

Here's a complete example of all Twilio variables in `.env.local`:

```bash
# ============================================
# Twilio Configuration
# ============================================

# Core Credentials
TWILIO_ACCOUNT_SID=AC5b2755f3368b771901559de123e52dc9
TWILIO_AUTH_TOKEN=f6f786e32dea6ae866a2e3b6c6444bf3

# OTP Authentication (via Supabase)
TWILIO_VERIFY_SERVICE_SID=VA69cb929c1fdd05362cd009be8f8a3f90

# SMS Messaging
TWILIO_MESSAGE_SERVICE_SID=MG7097b0bfd0cf1c72f73a9ffa073f9525

# WhatsApp Messaging
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_WHATSAPP_CONTENT_SID=HXb5b62575e6e4ff6129ad7c8efe1f983e

# Optional
TWILIO_API_KEY_SID=SK84935b7b5e89b32e43ab245902bde808
TWILIO_PHONE_NUMBER=+14155238886
```

## Usage

### OTP Authentication
OTP is handled automatically via Supabase once configured in the Supabase Dashboard. No direct code changes needed.

### WhatsApp Messaging
```typescript
import { sendWhatsAppMessage } from "@/lib/services/twilio";

// Send WhatsApp message
const result = await sendWhatsAppMessage(
  "+919740803490", // Recipient (E.164 format)
  "HXb5b62575e6e4ff6129ad7c8efe1f983e", // Content Template SID
  { "1": "12/1", "2": "3pm" } // Template variables
);
```

### SMS Messaging
```typescript
import { sendSMS } from "@/lib/services/twilio";

// Send SMS message
const result = await sendSMS(
  "+919740803490", // Recipient (E.164 format)
  "Your order has been confirmed!" // Message body
);
```

## Verification

After adding variables to `.env.local`:

1. **Restart your development server** (Next.js needs to reload environment variables)
2. **Verify variables are loaded**:
   ```typescript
   import { env } from "@/lib/config/env";
   console.log(env.TWILIO_ACCOUNT_SID); // Should show your Account SID
   ```
3. **Test WhatsApp messaging** (if configured):
   - Ensure Content Template is approved in Twilio Console
   - Test with a valid WhatsApp-enabled phone number

## Troubleshooting

- **Variables not loading**: Restart the Next.js dev server
- **WhatsApp messages failing**: Check that Content Template is approved in Twilio Console
- **OTP not working**: Verify Supabase Dashboard configuration (see SUPABASE_DASHBOARD_SETUP.md)
- **Invalid phone number**: Ensure phone numbers are in E.164 format (+[country code][number])

