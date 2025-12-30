import { NextResponse } from "next/server";
import { createSupabaseServerClientWithRequest, getSupabaseServiceClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/auth/sync-user
 * Syncs OAuth user to our database
 * Called after successful OAuth authentication
 * Uses Supabase client with authenticated session for RLS compatibility
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, name } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Use authenticated Supabase client (has auth context for RLS)
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      logger.warn("[Sync User] Supabase client not available");
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Check if user exists using Supabase client (RLS compatible)
    // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, phone, email, name, role, city, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found (acceptable)
      logger.error("[Sync User] Database select failed", {
        error: selectError.message,
        code: selectError.code,
        details: selectError.details,
        hint: selectError.hint,
      });
      
      return NextResponse.json(
        { 
          error: "Failed to sync user data. Please try again.", 
          code: "DATABASE_ERROR",
          ...(process.env.NODE_ENV === "development" && { 
            details: selectError.message,
            errorCode: selectError.code,
          }),
        },
        { status: 500 }
      );
    }

    if (!existingUser) {
      // Create new user - RLS policy allows users to insert their own record
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          phone: `oauth_${userId}`, // Placeholder - OAuth users may not have phone
          email: email || null,
          name: name || "User",
          role: 'customer',
        });

      if (insertError) {
        // Handle RLS recursion error (42P17) or permission denied (42501) - use service client
        if (insertError.code === '42P17' || insertError.code === '42501' || insertError.code === 'PGRST301') {
          logger.warn("[Sync User] RLS blocked insert, using service client", {
            error: insertError.message,
            code: insertError.code,
            userId,
          });
          
          const supabaseService = getSupabaseServiceClient();
          if (supabaseService) {
            // Use service client to bypass RLS
            const { data: serviceUser, error: serviceError } = await supabaseService
              .from('users')
              .insert({
                id: userId,
                phone: `sync_${userId}`,
                email: email || null,
                name: name || "User",
                role: 'customer',
              })
              .select()
              .single();

            if (serviceError) {
              logger.error("[Sync User] Service client insert failed", {
                error: serviceError.message,
                code: serviceError.code,
                details: serviceError.details,
                hint: serviceError.hint,
                userId,
              });
              
              return NextResponse.json(
                { 
                  error: "Failed to sync user data. Please try again.", 
                  code: "DATABASE_ERROR",
                  ...(process.env.NODE_ENV === "development" && { 
                    details: serviceError.message,
                    errorCode: serviceError.code,
                  }),
                },
                { status: 500 }
              );
            }
            
            logger.info(`[Sync User] User created via service client: ${serviceUser.id}`);
            return NextResponse.json({
              success: true,
              user: serviceUser,
              message: "User synced successfully",
            });
          } else {
            logger.error("[Sync User] Service client not available");
            return NextResponse.json(
              { error: "Service temporarily unavailable" },
              { status: 503 }
            );
          }
        }
        
        logger.error("[Sync User] Database insert failed", {
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          userId,
        });
        
        return NextResponse.json(
          { 
            error: "Failed to sync user data. Please try again.", 
            code: "DATABASE_ERROR",
            ...(process.env.NODE_ENV === "development" && { 
              details: insertError.message,
              errorCode: insertError.code,
            }),
          },
          { status: 500 }
        );
      }

      logger.info(`[Sync User] New user created: ${userId}`);
    } else {
      // Update user info if needed - RLS policy allows users to update their own record
      const updates: Record<string, unknown> = {};
      if (email && !existingUser.email) {
        updates.email = email;
      }
      if (name && !existingUser.name) {
        updates.name = name;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId);

        if (updateError) {
          logger.error("[Sync User] Database update failed", {
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
            userId,
          });
          
          return NextResponse.json(
            { 
              error: "Failed to sync user data. Please try again.", 
              code: "DATABASE_ERROR",
              ...(process.env.NODE_ENV === "development" && { 
                details: updateError.message,
                errorCode: updateError.code,
              }),
            },
            { status: 500 }
          );
        }

        logger.info(`[Sync User] User updated: ${userId}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Sync User] Sync failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: "Failed to sync user",
        ...(process.env.NODE_ENV === "development" && { 
          details: error instanceof Error ? error.message : String(error) 
        }),
      },
      { status: 500 }
    );
  }
}
