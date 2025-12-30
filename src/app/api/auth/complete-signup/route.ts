import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";

/**
 * Complete Signup API
 * Swiggy Dec 2025 pattern: Strict validation, direct database updates, no dev fallbacks.
 */
const completeSignupSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, "Invalid phone number format"),
  name: z.string().min(1, "Name is required").max(50, "Name must be less than 50 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, name } = completeSignupSchema.parse(body);

    // Use authenticated Supabase client (has auth context for RLS)
    // User is authenticated after OTP verification
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      logger.error("[Complete Signup] Supabase client not available");
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // Find user by phone using Supabase client (RLS compatible)
    let user;
    try {
      // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
      const { data: userData, error: selectError } = await supabase
        .from('users')
        .select('id, phone, email, name, role, city, created_at, updated_at')
        .eq('phone', phone)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found (acceptable)
        logger.error("[Complete Signup] Database query failed", {
          error: selectError.message,
          code: selectError.code,
          details: selectError.details,
          hint: selectError.hint,
          operation: "select",
          table: "users",
          phone: phone.replace(/\d(?=\d{4})/g, "*"),
        });
        
        return NextResponse.json(
          { 
            error: "Failed to process request. Please try again.", 
            code: "DATABASE_ERROR",
            ...(process.env.NODE_ENV === "development" && { 
              details: selectError.message,
              errorCode: selectError.code,
            }),
          },
          { status: 500 }
        );
      }

      user = userData || null;
    } catch (dbError) {
      logger.error("[Complete Signup] Database query failed", {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
        operation: "select",
        table: "users",
        phone: phone.replace(/\d(?=\d{4})/g, "*"),
      });
      
      return NextResponse.json(
        { 
          error: "Failed to process request. Please try again.", 
          code: "DATABASE_ERROR",
          ...(process.env.NODE_ENV === "development" && { 
            details: dbError instanceof Error ? dbError.message : String(dbError) 
          }),
        },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please verify OTP first.", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Update user with name - RLS policy allows users to update their own record
    let updatedUser;
    try {
      const { data: updatedUserData, error: updateError } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        logger.error("[Complete Signup] Database update failed", {
          error: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
          operation: "update",
          table: "users",
          userId: user.id,
        });
        
        return NextResponse.json(
          { 
            error: "Failed to update profile. Please try again.", 
            code: "DATABASE_ERROR",
            ...(process.env.NODE_ENV === "development" && { 
              details: updateError.message,
              errorCode: updateError.code,
            }),
          },
          { status: 500 }
        );
      }

      updatedUser = updatedUserData;
    } catch (dbError) {
      logger.error("[Complete Signup] Database update failed", {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
        operation: "update",
        table: "users",
        userId: user.id,
      });
      
      return NextResponse.json(
        { 
          error: "Failed to update profile. Please try again.", 
          code: "DATABASE_ERROR",
          ...(process.env.NODE_ENV === "development" && { 
            details: dbError instanceof Error ? dbError.message : String(dbError) 
          }),
        },
        { status: 500 }
      );
    }

    logger.info(`[Complete Signup] User profile completed: ${updatedUser.id}`);

    // Map Supabase response (snake_case) to camelCase for response
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
      message: "Account created successfully",
    });
  } catch (error) {
    logger.error("[Complete Signup] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof z.ZodError) {
      const errorDetails = error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return NextResponse.json(
        { 
          error: error.errors[0].message,
          code: "VALIDATION_ERROR",
          ...(process.env.NODE_ENV === "development" && { details: errorDetails }),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to complete signup. Please try again.", 
        code: "INTERNAL_ERROR",
        ...(process.env.NODE_ENV === "development" && { 
          details: error instanceof Error ? error.message : String(error) 
        }),
      },
      { status: 500 }
    );
  }
}
