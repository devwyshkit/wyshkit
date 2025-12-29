/**
 * Google OAuth Callback Handler
 * Swiggy Dec 2025 pattern: Simple OAuth callback with Supabase
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Handle Google OAuth callback from Supabase
 * Swiggy Dec 2025 pattern: Clean OAuth flow with automatic user creation
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      logger.error("[Google OAuth] OAuth error", {
        error,
        errorDescription,
      });
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    if (!code) {
      logger.error("[Google OAuth] No code provided");
      return NextResponse.redirect(
        new URL("/login?error=oauth_failed", request.url)
      );
    }

    const supabase = createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      logger.error("[Google OAuth] Supabase client not available");
      return NextResponse.redirect(
        new URL("/login?error=service_unavailable", request.url)
      );
    }

    // Exchange code for session
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError || !authData.user) {
      logger.error("[Google OAuth] Failed to exchange code for session", {
        error: authError?.message,
        code: authError?.code,
      });
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(authError?.message || "oauth_failed")}`,
          request.url
        )
      );
    }

    // Explicitly set session cookie - Swiggy Dec 2025 pattern: Explicit session management
    if (authData.session) {
      try {
        await supabase.auth.setSession(authData.session);
        logger.info("[Google OAuth] Session set successfully", {
          userId: authData.user.id,
          sessionExpiresAt: authData.session.expires_at,
        });
      } catch (sessionError) {
        logger.error("[Google OAuth] Failed to set session", {
          error: sessionError instanceof Error ? sessionError.message : String(sessionError),
          userId: authData.user.id,
        });
        // Continue anyway - session might still be accessible via cookies
      }
    } else {
      logger.warn("[Google OAuth] No session in authData", {
        userId: authData.user.id,
      });
    }

    // Sync user to our database
    if (db) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, authData.user.id))
        .limit(1)
        .then((rows) => rows[0] || null);

      if (!existingUser) {
        // Create new user from OAuth data
        const phone = authData.user.phone || null;
        const email = authData.user.email || null;
        const name = authData.user.user_metadata?.full_name || 
                    authData.user.user_metadata?.name || 
                    email?.split("@")[0] || 
                    "User";

        await db.insert(users).values({
          id: authData.user.id,
          phone: phone || `oauth_${authData.user.id}`, // Placeholder if no phone
          email,
          name,
          role: "customer",
        });

        logger.info(`[Google OAuth] New user created: ${authData.user.id}`);
      } else {
        // Update user info if needed
        const updates: Partial<typeof users.$inferInsert> = {};
        if (authData.user.email && !existingUser.email) {
          updates.email = authData.user.email;
        }
        if (authData.user.user_metadata?.full_name && !existingUser.name) {
          updates.name = authData.user.user_metadata.full_name;
        }

        if (Object.keys(updates).length > 0) {
          await db
            .update(users)
            .set(updates)
            .where(eq(users.id, authData.user.id));
        }
      }
    }

    // Get return URL from state or default to home
    const returnUrl = searchParams.get("state") || "/";

    // Redirect to return URL or home
    return NextResponse.redirect(new URL(returnUrl, request.url));
  } catch (error) {
    logger.error("[Google OAuth] Callback failed", error);
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url)
    );
  }
}

