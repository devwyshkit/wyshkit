import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { env } from "@/lib/config/env";
import { validateSupabaseUrl } from "@/lib/utils/supabase-validation";
import { normalizePhone, maskPhone } from "@/lib/utils/phone-normalization";

/**
 * Verify OTP using Supabase Auth
 * Swiggy Dec 2025 pattern: Proper cookie handling with @supabase/ssr
 */
const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, "Invalid phone number format. Use international format (e.g., +919740803490)"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { phone, otp } = verifyOtpSchema.parse(body);
    
    // Normalize phone to E.164 format
    phone = normalizePhone(phone);

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

    const supabase = await createSupabaseServerClientWithRequest(request);
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
        status: authError.status,
      });
      
      const errorCode = authError.code || "";
      const errorMessage = authError.message || "";
      const lowerMessage = errorMessage.toLowerCase();
      
      // OTP expired
      if (errorCode === "token_expired" || lowerMessage.includes("expired")) {
        return NextResponse.json(
          { error: "OTP has expired. Please request a new code.", code: "OTP_EXPIRED" },
          { status: 400 }
        );
      }

      // Invalid OTP
      if (errorCode === "invalid_token" || lowerMessage.includes("invalid") || lowerMessage.includes("incorrect")) {
        return NextResponse.json(
          { error: "Invalid OTP. Please check your code and try again.", code: "OTP_INVALID" },
          { status: 400 }
        );
      }

      // Rate limit
      if (errorCode === "rate_limit_exceeded" || lowerMessage.includes("rate limit")) {
        return NextResponse.json(
          { error: "Too many attempts. Please wait a moment and try again.", code: "RATE_LIMIT" },
          { status: 429 }
        );
      }

      // Generic error
      return NextResponse.json(
        { 
          error: "Unable to verify OTP. Please try again.", 
          code: "OTP_VERIFY_FAILED",
          ...(process.env.NODE_ENV === "development" && { details: errorMessage }),
        },
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

    // Security check: Prevent default admin accounts from logging in
    // Swiggy Dec 2025 pattern: No default accounts, security first
    const defaultAdminEmails = ['admin@example.com'];
    const defaultAdminPhones = ['+919876543214'];
    const defaultAdminIds = ['00000000-0000-0000-0000-000000000005'];
    
    if (
      (authData.user.email && defaultAdminEmails.includes(authData.user.email)) ||
      (authData.user.phone && defaultAdminPhones.includes(authData.user.phone)) ||
      defaultAdminIds.includes(authData.user.id)
    ) {
      logger.warn("[Verify OTP] Attempted login with default admin account - blocked", {
        userId: authData.user.id,
        email: authData.user.email,
        phone: authData.user.phone,
      });
      
      // Sign out the user immediately
      await supabase.auth.signOut();
      
      return NextResponse.json(
        {
          error: "This account is not authorized. Please contact support.",
          code: "ACCOUNT_NOT_AUTHORIZED",
        },
        { status: 403 }
      );
    }

    // With @supabase/ssr, setSession automatically sets cookies through the cookie store
    // We need to ensure cookies are included in the response
    if (authData.session) {
      const { error: sessionError } = await supabase.auth.setSession(authData.session);
      if (sessionError) {
        logger.error("[Verify OTP] Failed to set session", sessionError);
        // Continue anyway - session might still work
      }
    }

    // Sync user to our database using Supabase client (has auth context for RLS)
    // After setSession(), the Supabase client has the authenticated user's context
    // This allows RLS policies to work correctly (auth.uid() is available)
    let user;
    try {
      // Check if user exists
      // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id, phone, email, name, role, city, created_at, updated_at')
        .eq('phone', phone)
        .maybeSingle(); // Use maybeSingle() to handle not found gracefully

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found (acceptable)
        logger.error("[Verify OTP] Database select failed", {
          error: selectError.message,
          code: selectError.code,
          details: selectError.details,
          hint: selectError.hint,
        });
        throw selectError;
      }

      if (!existingUser) {
        // Try to find by user ID (in case phone doesn't match or user was created via OAuth)
        // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
        const { data: existingById, error: idSelectError } = await supabase
          .from('users')
          .select('id, phone, email, name, role, city, created_at, updated_at')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (idSelectError && idSelectError.code !== 'PGRST116') {
          logger.error("[Verify OTP] Database select by ID failed", {
            error: idSelectError.message,
            code: idSelectError.code,
            details: idSelectError.details,
            hint: idSelectError.hint,
            userId: authData.user.id,
          });
          throw idSelectError;
        }

        if (existingById) {
          // User exists with different phone - update phone if needed
          if (existingById.phone !== phone) {
            const { data: updatedUser, error: updateError } = await supabase
              .from('users')
              .update({ phone })
              .eq('id', authData.user.id)
              .select()
              .single();

            if (updateError) {
              logger.error("[Verify OTP] Failed to update phone", {
                error: updateError.message,
                code: updateError.code,
                userId: authData.user.id,
              });
              // Continue with existing user anyway
              user = existingById;
            } else {
              user = updatedUser;
              logger.info(`[Verify OTP] Updated phone for existing user: ${user.id}`);
            }
          } else {
            user = existingById;
            logger.info(`[Verify OTP] Found existing user by ID: ${user.id}`);
          }
        } else {
          // User doesn't exist - create new user
          // Try with authenticated client first (RLS policy allows users to insert their own record)
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              phone,
              role: 'customer',
            })
            .select()
            .single();

          // If RLS blocks (permission denied), use service client
          if (insertError && (insertError.code === '42501' || insertError.code === 'PGRST301')) {
            logger.warn("[Verify OTP] RLS blocked insert, using service client", {
              error: insertError.message,
              code: insertError.code,
              userId: authData.user.id,
            });
            
            const { getSupabaseServiceClient } = await import("@/lib/supabase/client");
            const supabaseService = getSupabaseServiceClient();
            
            if (supabaseService) {
              // Use service client to bypass RLS
              const { data: serviceUser, error: serviceError } = await supabaseService
                .from('users')
                .insert({
                  id: authData.user.id,
                  phone,
                  role: 'customer',
                })
                .select()
                .single();

              if (serviceError) {
                logger.error("[Verify OTP] Service client insert failed", {
                  error: serviceError.message,
                  code: serviceError.code,
                  details: serviceError.details,
                  hint: serviceError.hint,
                  userId: authData.user.id,
                });
                throw serviceError;
              }
              user = serviceUser;
              logger.info(`[Verify OTP] New user created via service client: ${user.id}`);
            } else {
              logger.error("[Verify OTP] Service client not available, cannot create user");
              throw insertError;
            }
          } else if (insertError) {
            logger.error("[Verify OTP] Database insert failed", {
              error: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint,
              userId: authData.user.id,
            });
            throw insertError;
          } else {
            user = newUser;
            logger.info(`[Verify OTP] New user created: ${user.id}`);
          }
        }
      } else if (existingUser.id !== authData.user.id) {
        // Update user ID if mismatch (migration case)
        // RLS policy allows users to update their own record
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ id: authData.user.id })
          .eq('phone', phone)
          .select()
          .single();

        if (updateError) {
          logger.error("[Verify OTP] Database update failed", {
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
            userId: authData.user.id,
            existingUserId: existingUser.id,
          });
          throw updateError;
        }
        user = updatedUser;
        logger.info(`[Verify OTP] User ID updated: ${existingUser.id} -> ${user.id}`);
      } else {
        user = existingUser;
      }
      
      // Final fallback: Ensure user is always created (Swiggy Dec 2025 pattern: Guarantee success)
      if (!user) {
        logger.warn("[Verify OTP] User not created after all attempts, using service client fallback", {
          userId: authData.user.id,
          phone: maskPhone(phone),
        });
        
        const { getSupabaseServiceClient } = await import("@/lib/supabase/client");
        const supabaseService = getSupabaseServiceClient();
        
        if (supabaseService) {
          const { data: serviceUser, error: serviceError } = await supabaseService
            .from('users')
            .insert({
              id: authData.user.id,
              phone,
              role: 'customer',
            })
            .select()
            .single();

          if (serviceError) {
            logger.error("[Verify OTP] Final service client fallback failed", {
              error: serviceError.message,
              code: serviceError.code,
              userId: authData.user.id,
            });
            // Don't throw - continue with auth even if user sync fails
            // User can be synced later via sync-user endpoint
          } else {
            user = serviceUser;
            logger.info(`[Verify OTP] User created via final service client fallback: ${user.id}`);
          }
        }
      }
    } catch (dbError: any) {
      logger.error("[Verify OTP] Database operation failed", {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        code: dbError?.code || dbError?.error_code,
        message: dbError?.message,
        details: dbError?.details,
        hint: dbError?.hint,
        stack: dbError instanceof Error ? dbError.stack : undefined,
        operation: "select/insert/update",
        table: "users",
        phone: maskPhone(phone),
        userId: authData.user.id,
      });
      
      return NextResponse.json(
        { 
          error: "Failed to sync user data. Please try again.", 
          code: "DATABASE_ERROR",
          ...(process.env.NODE_ENV === "development" && { 
            details: dbError instanceof Error ? dbError.message : String(dbError),
            errorCode: dbError?.code || dbError?.error_code,
            hint: dbError?.hint,
          }),
        },
        { status: 500 }
      );
    }

    logger.info(`[Verify OTP] User ${user.id} logged in successfully`);

    // Create response - cookies set via setSession() are automatically included
    // because they're set in the cookie store which Next.js includes in responses
    // Supabase returns data with database column names (snake_case for some, but id/phone/email/name/role are the same)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone || null,
        email: user.email || null,
        name: user.name || null,
        role: user.role || 'customer',
      },
      message: "Login successful.",
    });

    // Cookies are already set in the cookie store via setSession()
    // Next.js automatically includes them in the response
    return response;
  } catch (error) {
    // Handle phone normalization errors
    if (error instanceof Error && error.message.includes("Invalid phone number format")) {
      logger.error("[Verify OTP] Phone normalization failed", { error: error.message });
      return NextResponse.json(
        { error: "Invalid phone number format. Please use international format (e.g., +919740803490).", code: "INVALID_PHONE" },
        { status: 400 }
      );
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const errorDetails = error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      logger.error("[Verify OTP] Validation error", { errors: errorDetails });
      return NextResponse.json(
        { 
          error: "Invalid input format.", 
          code: "VALIDATION_ERROR",
          ...(process.env.NODE_ENV === "development" && { details: errorDetails }),
        },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    logger.error("[Verify OTP] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { 
        error: "An unexpected error occurred. Please try again.", 
        code: "INTERNAL_ERROR",
        ...(process.env.NODE_ENV === "development" && { 
          details: error instanceof Error ? error.message : String(error) 
        }),
      },
      { status: 500 }
    );
  }
}
