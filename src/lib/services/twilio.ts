/**
 * Twilio Messaging Service
 * Swiggy Dec 2025 pattern: Direct Twilio API integration for WhatsApp messaging
 * 
 * This service handles WhatsApp messaging using Twilio's Content API.
 * OTP authentication is handled separately via Supabase (which uses Twilio Verify).
 */

import { env } from "@/lib/config/env";
import { logger } from "@/lib/utils/logger";

/**
 * Send WhatsApp message using Twilio Content API
 * 
 * @param to - Recipient phone number in E.164 format (e.g., +919740803490 or whatsapp:+919740803490)
 * @param contentSid - Twilio Content Template SID (e.g., HXb5b62575e6e4ff6129ad7c8efe1f983e)
 * @param contentVariables - Template variables as key-value pairs (e.g., { "1": "12/1", "2": "3pm" })
 * @returns Promise with success status and optional message SID or error
 */
export async function sendWhatsAppMessage(
  to: string,
  contentSid: string,
  contentVariables: Record<string, string> = {}
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    // Validate required environment variables
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken) {
      const error = "Twilio Account SID and Auth Token are required";
      logger.error("[Twilio] Missing credentials", { hasAccountSid: !!accountSid, hasAuthToken: !!authToken });
      return { success: false, error };
    }

    if (!whatsappNumber) {
      const error = "Twilio WhatsApp number is required";
      logger.error("[Twilio] Missing WhatsApp number");
      return { success: false, error };
    }

    if (!contentSid) {
      const error = "Content SID is required";
      logger.error("[Twilio] Missing Content SID");
      return { success: false, error };
    }

    // Format phone number - ensure whatsapp: prefix for To field
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    // Build request body
    const formData = new URLSearchParams();
    formData.append("To", formattedTo);
    formData.append("From", whatsappNumber);
    formData.append("ContentSid", contentSid);

    // Add Content Variables as JSON string if provided
    if (Object.keys(contentVariables).length > 0) {
      formData.append("ContentVariables", JSON.stringify(contentVariables));
    }

    // Twilio API endpoint
    const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Make request to Twilio API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body: formData.toString(),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errorMessage = responseData.message || `Twilio API error: ${response.status}`;
      logger.error("[Twilio] Failed to send WhatsApp message", {
        status: response.status,
        error: errorMessage,
        code: responseData.code,
        to: formattedTo.replace(/\d(?=\d{4})/g, "*"), // Mask phone number in logs
      });
      return { success: false, error: errorMessage };
    }

    // Success
    logger.info("[Twilio] WhatsApp message sent successfully", {
      messageSid: responseData.sid,
      to: formattedTo.replace(/\d(?=\d{4})/g, "*"), // Mask phone number in logs
    });

    return {
      success: true,
      messageSid: responseData.sid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Twilio] Exception while sending WhatsApp message", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: errorMessage };
  }
}

/**
 * Send SMS message using Twilio Messaging Service
 * 
 * @param to - Recipient phone number in E.164 format (e.g., +919740803490)
 * @param body - Message body text
 * @returns Promise with success status and optional message SID or error
 */
export async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    // Validate required environment variables
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = env.TWILIO_MESSAGE_SERVICE_SID;

    if (!accountSid || !authToken) {
      const error = "Twilio Account SID and Auth Token are required";
      logger.error("[Twilio] Missing credentials", { hasAccountSid: !!accountSid, hasAuthToken: !!authToken });
      return { success: false, error };
    }

    if (!messagingServiceSid) {
      const error = "Twilio Messaging Service SID is required";
      logger.error("[Twilio] Missing Messaging Service SID");
      return { success: false, error };
    }

    if (!body || body.trim().length === 0) {
      const error = "Message body is required";
      logger.error("[Twilio] Missing message body");
      return { success: false, error };
    }

    // Build request body
    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("MessagingServiceSid", messagingServiceSid);
    formData.append("Body", body);

    // Twilio API endpoint
    const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Make request to Twilio API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body: formData.toString(),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errorMessage = responseData.message || `Twilio API error: ${response.status}`;
      logger.error("[Twilio] Failed to send SMS", {
        status: response.status,
        error: errorMessage,
        code: responseData.code,
        to: to.replace(/\d(?=\d{4})/g, "*"), // Mask phone number in logs
      });
      return { success: false, error: errorMessage };
    }

    // Success
    logger.info("[Twilio] SMS sent successfully", {
      messageSid: responseData.sid,
      to: to.replace(/\d(?=\d{4})/g, "*"), // Mask phone number in logs
    });

    return {
      success: true,
      messageSid: responseData.sid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Twilio] Exception while sending SMS", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: errorMessage };
  }
}




