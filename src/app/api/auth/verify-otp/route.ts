import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { env, isDevelopment } from "@/lib/config/env";
import { validateSupabaseUrl } from "@/lib/utils/supabase-validation";

/**
 * Verify OTP using Supabase Auth
 * Swiggy Dec 2025 pattern: No dev bypasses, strict validation, clean error mapping.
 */
const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, "Invalid phone number format. Use international format (e.g., +919740803490)"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, otp } = verifyOtpSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    const urlValidation = validateSupabaseUrl(supabaseUrl);
    
    if (!urlValidation.valid) {
      logger.error("[Verify OTP] Invalid Supabase URL");
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
      logger.error("[Verify OTP] Supabase client not available");
      return NextResponse.json(
        { 
          error: "Service temporarily unavailable. Please try again later.",
          code: "SERVICE_UNAVAILABLE"
        },
        { status: 503 }
      );
    }

    // Verify OTP with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms'
    });

    if (authError) {
      logger.error("[Verify OTP] Supabase verification error", {
        code: authError.code || "UNKNOWN",
        message: authError.message,
      });
      
      const errorCode = authError.code || "";
      const errorMessage = authError.message || "";
      
      if (errorCode === "token_expired" || errorMessage.includes("expired")) {
        return NextResponse.json(
          { error: "OTP has expired. Please request a new code.", code: "OTP_EXPIRED" },
          { status: 400 }
        );
      }

      if (errorCode === "invalid_token" || errorMessage.includes("invalid")) {
        return NextResponse.json(
          { error: "Invalid OTP. Please check your code and try again.", code: "OTP_INVALID" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to verify OTP. Please try again.", code: "OTP_VERIFY_FAILED" },
        { status: 400 }
      );
    }

    if (!authData.user) {
      logger.error("[Verify OTP] No user returned from Supabase");
      return NextResponse.json(
        { error: "Authentication failed. Please try again.", code: "AUTH_FAILED" },
        { status: 500 }
      );
    }

    // Explicitly set session cookie
    if (authData.session) {
      await supabase.auth.setSession(authData.session);
    }

    // Sync user to our database
    let user;
    if (db) {
      [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

      if (!user) {
        [user] = await db.insert(users).values({
          id: authData.user.id,
          phone,
          role: "customer",
        }).returning();
        logger.info(`[Verify OTP] New user created: ${user.id}`);
      } else if (user.id !== authData.user.id) {
        // Handle ID mismatch (migration case)
        [user] = await db.update(users).set({ id: authData.user.id }).where(eq(users.phone, phone)).returning();
      }
    } else {
      logger.error("[Verify OTP] Database connection not available");
      return NextResponse.json(
        { error: "Service temporarily unavailable.", code: "DATABASE_UNAVAILABLE" },
        { status: 503 }
      );
    }

    logger.info(`[Verify OTP] User ${user.id} logged in successfully`);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message: "Login successful.",
    });
  } catch (error) {
    logger.error("[Verify OTP] Failed", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input format.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
