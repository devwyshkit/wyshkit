import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { env, isDevelopment } from "@/lib/config/env";
import { validateSupabaseUrl } from "@/lib/utils/supabase-validation";
import { normalizePhone, maskPhone } from "@/lib/utils/phone-normalization";

/**
 * Send OTP using Supabase Auth
 * Swiggy Dec 2025 pattern: No dev bypasses in production-ready code.
 */
const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, "Phone number must be in international format (e.g., +919740803490)"),
});

export async function POST(request: Request) {
  // Swiggy Dec 2025 pattern: Use logger directly - if it fails, let it fail (better than silent failures)

  try {
    // Request validation - check method
    if (request.method !== "POST") {
      return NextResponse.json(
        { 
          error: "Method not allowed",
          code: "METHOD_NOT_ALLOWED"
        },
        { status: 405 }
      );
    }

    // Request validation - check Content-Type
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { 
          error: "Content-Type must be application/json",
          code: "INVALID_CONTENT_TYPE"
        },
        { status: 400 }
      );
    }

    // Safe request body parsing
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.error("[Send OTP] Failed to parse request body", {
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return NextResponse.json(
        { 
          error: "Invalid request body. Expected JSON.",
          code: "INVALID_REQUEST_BODY",
          ...(isDevelopment && { 
            details: parseError instanceof Error ? parseError.message : String(parseError)
          }),
        },
        { status: 400 }
      );
    }

    // Validate request body schema
    let rawPhone: string;
    try {
      const parsed = sendOtpSchema.parse(body);
      rawPhone = parsed.phone;
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: "Invalid phone number format. Use international format (e.g., +919740803490).",
            code: "VALIDATION_ERROR",
            ...(isDevelopment && { 
              details: validationError.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
            }),
          },
          { status: 400 }
        );
      }
      throw validationError; // Re-throw if not a ZodError
    }

    // Normalize phone number to E.164 format
    let phone: string;
    try {
      phone = normalizePhone(rawPhone);
      logger.info("[Send OTP] Normalized phone number", {
        original: rawPhone,
        normalized: maskPhone(phone),
      });
    } catch (normalizeError) {
      logger.error("[Send OTP] Phone normalization failed", {
        original: rawPhone,
        error: normalizeError instanceof Error ? normalizeError.message : String(normalizeError),
      });
      return NextResponse.json(
        { 
          error: "Invalid phone number format. Please use international format (e.g., +919740803490).",
          code: "INVALID_PHONE_FORMAT",
          ...(isDevelopment && { 
            details: normalizeError instanceof Error ? normalizeError.message : String(normalizeError),
            originalPhone: rawPhone,
          }),
        },
        { status: 400 }
      );
    }

    // Safe environment variable access
    let supabaseUrl: string | undefined;
    try {
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    } catch (envError) {
      logger.error("[Send OTP] Failed to access environment variables", {
        error: envError instanceof Error ? envError.message : String(envError),
      });
      return NextResponse.json(
        { 
          error: "Configuration error. Please contact support.",
          code: "CONFIG_ERROR",
          ...(isDevelopment && { 
            details: envError instanceof Error ? envError.message : String(envError)
          }),
        },
        { status: 500 }
      );
    }

    // Validate Supabase URL
    let urlValidation: { valid: boolean; error?: string; projectId?: string };
    try {
      urlValidation = validateSupabaseUrl(supabaseUrl);
    } catch (validationError) {
      logger.error("[Send OTP] URL validation failed", {
        error: validationError instanceof Error ? validationError.message : String(validationError),
      });
      return NextResponse.json(
        { 
          error: "Configuration error. Please contact support.",
          code: "CONFIG_ERROR",
          ...(isDevelopment && { 
            details: validationError instanceof Error ? validationError.message : String(validationError)
          }),
        },
        { status: 500 }
      );
    }
    
    if (!urlValidation || !urlValidation.valid) {
      logger.error("[Send OTP] Invalid Supabase URL", {
        url: isDevelopment ? supabaseUrl : "configured",
        error: urlValidation.error,
      });
      return NextResponse.json(
        { 
          error: "Authentication service is not properly configured.",
          code: "INVALID_CONFIG",
          ...(isDevelopment && { 
            details: urlValidation.error
          }),
        },
        { status: 500 }
      );
    }

    // Safe Supabase client creation
    let supabase;
    try {
      supabase = await createSupabaseServerClientWithRequest(request);
    } catch (clientError) {
      logger.error("[Send OTP] Failed to create Supabase client", {
        error: clientError instanceof Error ? clientError.message : String(clientError),
        stack: clientError instanceof Error ? clientError.stack : undefined,
      });
      return NextResponse.json(
        { 
          error: "Service temporarily unavailable. Please try again later.",
          code: "CLIENT_ERROR",
          ...(isDevelopment && { 
            hint: "Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
            details: clientError instanceof Error ? clientError.message : String(clientError)
          }),
        },
        { status: 503 }
      );
    }

    if (!supabase) {
      logger.error("[Send OTP] Supabase client not available");
      return NextResponse.json(
        { 
          error: "Service temporarily unavailable. Please try again later.",
          code: "SERVICE_UNAVAILABLE",
          ...(isDevelopment && { 
            hint: "Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
          }),
        },
        { status: 503 }
      );
    }

    // Configuration validation - check if Twilio credentials are in environment
    // Note: This doesn't verify if they're configured in Supabase Dashboard (manual step)
    const hasTwilioConfig = 
      process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_VERIFY_SERVICE_SID;
    
    if (!hasTwilioConfig && isDevelopment) {
      logger.warn("[Send OTP] Twilio credentials not found in environment", {
        hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasVerifyService: !!process.env.TWILIO_VERIFY_SERVICE_SID,
        hint: "Twilio credentials must also be configured in Supabase Dashboard → Authentication → Providers → Phone",
      });
    }

    logger.info("[Send OTP] Attempting to send OTP", {
      phone: maskPhone(phone),
      hasTwilioEnvVars: hasTwilioConfig,
    });
    
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        channel: 'sms'
      }
    });

    if (error) {
      // Detailed error logging with full error object
      logger.error("[Send OTP] Supabase error", {
        code: error.code || "UNKNOWN",
        message: error.message,
        status: error.status,
        name: error.name,
        fullError: isDevelopment ? JSON.stringify(error, null, 2) : undefined,
      });
      
      const errorCode = error.code || "";
      const errorMessage = error.message || "";
      const lowerMessage = errorMessage.toLowerCase();
      
      // Handle specific error codes with actionable messages
      
      // Rate limiting
      if (errorCode === "rate_limit_exceeded" || lowerMessage.includes("rate limit") || lowerMessage.includes("too many")) {
        return NextResponse.json(
          { 
            error: "Too many requests. Please wait a moment before requesting another OTP.",
            code: "RATE_LIMIT",
            ...(isDevelopment && { details: errorMessage }),
          },
          { status: 429 }
        );
      }
      
      // SMS provider not configured - Enhanced detection
      if (
        errorCode === "sms_provider_not_configured" ||
        errorCode === "phone_provider_not_enabled" ||
        lowerMessage.includes("sms provider") ||
        lowerMessage.includes("phone provider") && (lowerMessage.includes("disabled") || lowerMessage.includes("not enabled")) ||
        (lowerMessage.includes("twilio") && lowerMessage.includes("not configured")) ||
        lowerMessage.includes("sms service not configured") ||
        lowerMessage.includes("no sms provider") ||
        lowerMessage.includes("provider not found")
      ) {
        return NextResponse.json(
          { 
            error: "SMS service is not configured. Please configure Twilio in Supabase Dashboard.",
            code: "SMS_NOT_CONFIGURED",
            hint: "Go to Supabase Dashboard → Authentication → Providers → Phone → Enable Phone provider → Select Twilio → Enter credentials",
            ...(isDevelopment && { 
              details: "Twilio credentials need to be configured in Supabase Dashboard → Authentication → Providers → Phone",
              errorMessage,
              errorCode,
              dashboardUrl: `https://supabase.com/dashboard/project/${urlValidation.projectId || 'your-project'}/auth/providers`,
            }),
          },
          { status: 500 }
        );
      }
      
      // Invalid phone number
      if (
        errorCode === "invalid_phone_number" ||
        lowerMessage.includes("invalid phone") ||
        lowerMessage.includes("phone number") && lowerMessage.includes("invalid")
      ) {
        return NextResponse.json(
          { 
            error: "Invalid phone number format. Please use international format (e.g., +919740803490).",
            code: "INVALID_PHONE",
            ...(isDevelopment && { details: errorMessage }),
          },
          { status: 400 }
        );
      }
      
      // SMS sending failed (Twilio API error)
      // Twilio error 21212 = Invalid From Number (caller ID) - Verify Service SID misconfigured
      // Twilio error 20404 = Verify Service not found
      if (
        errorCode === "sms_send_failed" ||
        errorCode === "sms_sending_failed" ||
        lowerMessage.includes("sms sending failed") ||
        lowerMessage.includes("sms send failed") ||
        lowerMessage.includes("failed to send") ||
        lowerMessage.includes("twilio") && (lowerMessage.includes("error") || lowerMessage.includes("failed")) ||
        lowerMessage.includes("21212") ||
        lowerMessage.includes("20404") ||
        lowerMessage.includes("invalid from number") ||
        lowerMessage.includes("invalid caller id") ||
        (lowerMessage.includes("invalid") && lowerMessage.includes("phone number"))
      ) {
        // Check for specific Twilio error 21212 (Invalid From Number)
        const isInvalidFromNumber = lowerMessage.includes("21212") || 
                                   lowerMessage.includes("invalid from number") ||
                                   lowerMessage.includes("invalid caller id");
        
        return NextResponse.json(
          { 
            error: isInvalidFromNumber 
              ? "SMS service configuration error. Verify Service SID is incorrect or service is disabled."
              : "Failed to send SMS. Please check your phone number and try again.",
            code: "SMS_SEND_FAILED",
            hint: isInvalidFromNumber
              ? "Check Twilio Console → Verify → Services. Ensure Verify Service SID matches Supabase Dashboard configuration. Also check Twilio account balance."
              : "Check Twilio account balance, Verify Service status, and phone number format.",
            ...(isDevelopment && { 
              details: errorMessage,
              phoneNumberUsed: maskPhone(phone),
              twilioError: isInvalidFromNumber ? "21212 - Invalid From Number (Verify Service SID)" : undefined,
              hint: isInvalidFromNumber 
                ? "Twilio error 21212: Verify Service SID is being used as 'From' number incorrectly. Check Supabase Dashboard → Authentication → Providers → Phone → Twilio Verify Service SID"
                : "Check Twilio Console → Verify → Services and account balance",
            }),
          },
          { status: 500 }
        );
      }
      
      // Generic error with detailed message - always include actual error for debugging
      return NextResponse.json(
        { 
          error: "Unable to send OTP. Please check your number and try again.",
          code: "OTP_SEND_FAILED",
          // Always include actual error code and message for debugging
          actualErrorCode: errorCode || "UNKNOWN",
          actualErrorMessage: errorMessage || "No error message provided",
          ...(isDevelopment && { 
            details: {
              errorCode,
              errorMessage,
              errorStatus: error.status,
              errorName: error.name,
              hint: "Check Supabase Dashboard → Authentication → Providers → Phone to verify Twilio is configured",
              fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
            }
          }),
        },
        { status: 500 }
      );
    }
    
    // Success - log for debugging
    // Note: Supabase may return success even if SMS provider isn't configured
    // The actual SMS sending happens asynchronously, so we can't detect it here
    // However, we should check the response for any hidden error codes or warnings
    
    // Check for silent failures - Supabase may return success but with error_code in data
    let silentFailureDetected = false;
    let silentFailureMessage = "";
    
    if (data) {
      // Check for error_code in response (Supabase sometimes includes this even on 200)
      const responseErrorCode = (data as any)?.error_code || (data as any)?.code;
      const responseMessage = (data as any)?.message || "";
      const responseMessageLower = responseMessage.toLowerCase();
      
      if (responseErrorCode === "sms_send_failed" || 
          responseMessageLower.includes("sms send failed") ||
          responseMessageLower.includes("failed to send")) {
        silentFailureDetected = true;
        silentFailureMessage = responseMessage || "SMS delivery failed silently";
        
        logger.error("[Send OTP] Silent failure detected in Supabase response", {
          phone: maskPhone(phone),
          errorCode: responseErrorCode,
          message: responseMessage,
          fullResponse: isDevelopment ? JSON.stringify(data, null, 2) : undefined,
        });
      } else {
        // Log full response for debugging (even on success)
        logger.info("[Send OTP] OTP request accepted by Supabase", {
          phone: maskPhone(phone),
          hasErrorCode: !!responseErrorCode,
          errorCode: responseErrorCode,
          ...(isDevelopment && data ? { supabaseResponse: JSON.stringify(data, null, 2) } : {}),
        });
      }
    } else {
      // No data returned - log this as potential issue
      logger.warn("[Send OTP] OTP request accepted but no data returned", {
        phone: maskPhone(phone),
      });
    }

    // If silent failure detected, return error instead of success
    if (silentFailureDetected) {
      return NextResponse.json(
        {
          error: "SMS delivery failed. Please check Twilio account balance and Verify Service status.",
          code: "SMS_SEND_FAILED",
          hint: "Check Twilio Console → Verify → Services and account balance. Also verify Supabase Dashboard → Authentication → Providers → Phone configuration.",
          ...(isDevelopment && {
            details: silentFailureMessage,
            phoneNumberUsed: maskPhone(phone),
            hint: "Silent failure detected: Supabase returned success but SMS delivery failed. Check Twilio account status.",
          }),
        },
        { status: 500 }
      );
    }

    // Warn if Twilio env vars exist but might not be configured in dashboard
    if (hasTwilioConfig && isDevelopment) {
      logger.warn("[Send OTP] OTP request accepted, but verify Twilio is configured in Supabase Dashboard", {
        hint: "If OTP doesn't arrive, check Supabase Dashboard → Authentication → Providers → Phone",
      });
    }

    // Success - trust Supabase's response
    // Swiggy Dec 2025 pattern: Trust Supabase, only warn on actual errors
    // If signInWithOtp succeeds without error, assume SMS was sent successfully
    return NextResponse.json({
      success: true,
      message: "OTP sent successfully.",
      // Only show hint in dev mode if Twilio env vars are missing (helps with setup)
      ...(isDevelopment && !hasTwilioConfig && {
        hint: "Twilio credentials not found in environment. Ensure they're configured in Supabase Dashboard.",
      }),
    });
  } catch (error) {
    // Enhanced error logging with full details
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
      ...(isDevelopment && { fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) }),
    };
    
    // Swiggy Dec 2025 pattern: Use logger directly - if it fails, let it fail
    logger.error("[Send OTP] Unexpected error", errorDetails);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid phone number format. Use international format (e.g., +919740803490).",
          code: "VALIDATION_ERROR",
          ...(isDevelopment && { 
            details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
          }),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "An unexpected error occurred. Please try again.",
        code: "INTERNAL_ERROR",
        ...(isDevelopment && { 
          details: {
            message: errorDetails.message,
            name: errorDetails.name,
            hint: "Check server console logs for more details",
            stack: errorDetails.stack,
          }
        }),
      },
      { status: 500 }
    );
  }
}
