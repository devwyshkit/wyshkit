import { NextResponse } from "next/server";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { isAuthError, isErrorWithStatus, formatApiError } from "@/lib/types/api-errors";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const userId = user.id;

    // Use authenticated Supabase client (has auth context for RLS)
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      logger.warn("[API /users] Supabase client not available");
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    let userData;
    try {
      // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
      const { data: userRecord, error: selectError } = await supabase
        .from('users')
        .select('id, phone, email, name, role, city, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (selectError) {
        if (selectError.code === 'PGRST116') { // Not found
          return NextResponse.json({ error: "User not found", code: "USER_NOT_FOUND" }, { status: 404 });
        }
        
        logger.error("[API /users] Database query failed", {
          error: selectError.message,
          code: selectError.code,
          details: selectError.details,
          hint: selectError.hint,
          operation: "select",
          table: "users",
          userId,
        });
        
        return NextResponse.json(
          { 
            error: "Failed to fetch user data. Please try again.", 
            code: "DATABASE_ERROR",
            ...(process.env.NODE_ENV === "development" && { 
              details: selectError.message,
              errorCode: selectError.code,
            }),
          },
          { status: 500 }
        );
      }

      userData = userRecord;
    } catch (dbError) {
      logger.error("[API /users] Database query failed", {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
        operation: "select",
        table: "users",
        userId,
      });
      
      return NextResponse.json(
        { 
          error: "Failed to fetch user data. Please try again.", 
          code: "DATABASE_ERROR",
          ...(process.env.NODE_ENV === "development" && { 
            details: dbError instanceof Error ? dbError.message : String(dbError) 
          }),
        },
        { status: 500 }
      );
    }

    // Map Supabase response (snake_case) to camelCase for response
    return NextResponse.json({
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        city: userData.city,
        createdAt: userData.created_at ? new Date(userData.created_at).toISOString() : null,
        updatedAt: userData.updated_at ? new Date(userData.updated_at).toISOString() : null,
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      logger.warn("[API /users] Authentication required");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    logger.error("[API /users] GET error", error);
    const errorResponse = formatApiError(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth(request);
    const userId = user.id;
    
    const body = await request.json();
    const { userId: _, ...updateData } = body;

    // Use authenticated Supabase client (has auth context for RLS)
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    // Build update fields (Supabase uses snake_case for database columns)
    const updateFields: Record<string, unknown> = {};
    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.email !== undefined) updateFields.email = updateData.email;
    if (updateData.city !== undefined) updateFields.city = updateData.city;
    updateFields.updated_at = new Date().toISOString();

    let updatedUser;
    try {
      const { data: updatedUserData, error: updateError } = await supabase
        .from('users')
        .update(updateFields)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        logger.error("[API /users] Database update failed", {
          error: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
          operation: "update",
          table: "users",
          userId,
        });
        
        return NextResponse.json(
          { 
            error: "Failed to update user. Please try again.", 
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
      logger.error("[API /users] Database update failed", {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
        operation: "update",
        table: "users",
        userId,
      });
      
      return NextResponse.json(
        { 
          error: "Failed to update user. Please try again.", 
          code: "DATABASE_ERROR",
          ...(process.env.NODE_ENV === "development" && { 
            details: dbError instanceof Error ? dbError.message : String(dbError) 
          }),
        },
        { status: 500 }
      );
    }

    logger.info("[API /users] Updated user", userId);

    // Map Supabase response (snake_case) to camelCase for response
    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        city: updatedUser.city,
        createdAt: updatedUser.created_at ? new Date(updatedUser.created_at).toISOString() : null,
        updatedAt: updatedUser.updated_at ? new Date(updatedUser.updated_at).toISOString() : null,
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      logger.warn("[API /users] Authentication required");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    logger.error("[API /users] PUT error", error);
    const errorResponse = formatApiError(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
