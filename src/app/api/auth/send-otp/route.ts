import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { env, isDevelopment } from "@/lib/config/env";
import { validateSupabaseUrl } from "@/lib/utils/supabase-validation";

/**
 * Send OTP using Supabase Auth
 * Swiggy Dec 2025 pattern: No dev bypasses in production-ready code.
 */
const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, "Phone number must be in international format (e.g., +919740803490)"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = sendOtpSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    const urlValidation = validateSupabaseUrl(supabaseUrl);
    
    if (!urlValidation.valid) {
      logger.error("[Send OTP] Invalid Supabase URL", {
        url: isDevelopment ? supabaseUrl : "configured",
      });
      return NextResponse.json(
        { 
          error: "Authentication service is not properly configured.",
          code: "INVALID_CONFIG"
        },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      logger.error("[Send OTP] Supabase client not available");
      return NextResponse.json(
        { 
          error: "Service temporarily unavailable. Please try again later.",
          code: "SERVICE_UNAVAILABLE"
        },
        { status: 503 }
      );
    }

    logger.info("[Send OTP] Attempting to send OTP", {
      phone: phone.replace(/\d(?=\d{4})/g, "*"),
    });
    
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        channel: 'sms'
      }
    });

    if (error) {
      logger.error("[Send OTP] Supabase error", {
        code: error.code || "UNKNOWN",
        message: error.message,
      });
      
      const errorCode = error.code || "";
      const errorMessage = error.message || "";
      
      if (errorCode === "rate_limit_exceeded" || errorMessage.includes("rate limit")) {
        return NextResponse.json(
          { 
            error: "Too many requests. Please wait a moment.",
            code: "RATE_LIMIT"
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { 
          error: "Unable to send OTP. Please check your number and try again.",
          code: "OTP_SEND_FAILED"
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully.",
    });
  } catch (error) {
    logger.error("[Send OTP] Failed", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid phone number format. Use international format (e.g., +91...)",
          code: "VALIDATION_ERROR"
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "An unexpected error occurred. Please try again.",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    );
  }
}
