/**
 * Google OAuth Callback Handler
 * Swiggy Dec 2025 pattern: Simple OAuth callback with Supabase
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";

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
    const state = searchParams.get("state");

    // Handle OAuth errors
    if (error) {
      logger.error("[Google OAuth] OAuth error", {
        error,
        errorDescription,
        url: request.url,
      });
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    // If no code, check if this might be a fragment-based flow
    // Fragment-based flows put tokens in URL hash, which server can't read
    // Redirect to client-side handler
    if (!code) {
      logger.warn("[Google OAuth] No code parameter - may be fragment-based flow", {
        url: request.url,
        hasState: !!state,
      });
      
      // Redirect to client-side handler which can read URL fragments
      // The client-side handler will extract tokens from the hash
      const clientCallbackUrl = state 
        ? `/auth/callback?state=${encodeURIComponent(state)}`
        : "/auth/callback";
      
      return NextResponse.redirect(new URL(clientCallbackUrl, request.url));
    }

    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      logger.error("[Google OAuth] Supabase client not available");
      return NextResponse.redirect(
        new URL("/login?error=service_unavailable", request.url)
      );
    }

    // Exchange code for session
    // With @supabase/ssr, exchangeCodeForSession automatically sets cookies through the cookie store
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError || !authData.user) {
      logger.error("[Google OAuth] Failed to exchange code for session", {
        error: authError?.message,
        code: authError?.code,
        status: authError?.status,
        url: request.url,
      });
      
      // Provide more specific error messages
      let errorMessage = "oauth_failed";
      if (authError?.message) {
        if (authError.message.includes("expired") || authError.message.includes("invalid")) {
          errorMessage = "The authorization code has expired or is invalid. Please try signing in again.";
        } else if (authError.message.includes("redirect_uri")) {
          errorMessage = "Redirect URL mismatch. Please check Supabase Dashboard configuration.";
        } else {
          errorMessage = authError.message;
        }
      }
      
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(errorMessage)}`,
          request.url
        )
      );
    }

    // With @supabase/ssr, the session is automatically set in cookies via exchangeCodeForSession
    // No need to explicitly call setSession - it's already handled
    if (authData.session) {
      logger.info("[Google OAuth] Session set successfully", {
        userId: authData.user.id,
        sessionExpiresAt: authData.session.expires_at,
      });
    } else {
      logger.warn("[Google OAuth] No session in authData", {
        userId: authData.user.id,
      });
    }

    // Sync user to our database using Supabase client (has auth context for RLS)
    // After exchangeCodeForSession, the Supabase client has the authenticated user's context
    // This allows RLS policies to work correctly (auth.uid() is available)
    try {
      // Check if user exists
      // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id, phone, email, name, role, city, created_at, updated_at')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found (acceptable)
        logger.error("[Google OAuth] Database select failed", {
          error: selectError.message,
          code: selectError.code,
          details: selectError.details,
          hint: selectError.hint,
        });
        // Continue anyway - user sync is not critical for OAuth flow
      } else if (!existingUser) {
        // Create new user from OAuth data - RLS policy allows users to insert their own record
        const phone = authData.user.phone || null;
        const email = authData.user.email || null;
        const name = authData.user.user_metadata?.full_name || 
                    authData.user.user_metadata?.name || 
                    email?.split("@")[0] || 
                    "User";

        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            phone: phone || `oauth_${authData.user.id}`, // Placeholder if no phone
            email,
            name,
            role: 'customer',
          });

        if (insertError) {
          logger.error("[Google OAuth] Database insert failed", {
            error: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            userId: authData.user.id,
          });
          // Continue anyway - user sync is not critical for OAuth flow
        } else {
          logger.info(`[Google OAuth] New user created: ${authData.user.id}`);
        }
      } else {
        // Update user info if needed - RLS policy allows users to update their own record
        const updates: Record<string, unknown> = {};
        if (authData.user.email && !existingUser.email) {
          updates.email = authData.user.email;
        }
        if (authData.user.user_metadata?.full_name && !existingUser.name) {
          updates.name = authData.user.user_metadata.full_name;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', authData.user.id);

          if (updateError) {
            logger.error("[Google OAuth] Database update failed", {
              error: updateError.message,
              code: updateError.code,
              details: updateError.details,
              hint: updateError.hint,
              userId: authData.user.id,
            });
            // Continue anyway - user sync is not critical for OAuth flow
          }
        }
      }
    } catch (dbError) {
      logger.error("[Google OAuth] Database sync failed", {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
        userId: authData.user.id,
      });
      // Continue anyway - user sync is not critical for OAuth flow
    }

    // Get return URL from state or default to home
    const returnUrl = searchParams.get("state") || "/";

    // Redirect to return URL or home
    return NextResponse.redirect(new URL(returnUrl, request.url));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error("[Google OAuth] Callback failed", {
      error: errorMessage,
      stack: errorStack,
      url: request.url,
    });
    
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("An unexpected error occurred during authentication. Please try again.")}`,
        request.url
      )
    );
  }
}

