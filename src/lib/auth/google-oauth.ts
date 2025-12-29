/**
 * Google OAuth Helper
 * Swiggy Dec 2025 pattern: Simple OAuth initiation with Supabase
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { env } from "@/lib/config/env";

/**
 * Initiate Google OAuth sign-in
 * Swiggy Dec 2025 pattern: Clean OAuth flow with return URL support
 * Returns the OAuth URL that must be used for redirect
 */
export async function signInWithGoogle(returnUrl?: string): Promise<string> {
  // Client-side only check
  if (typeof window === "undefined") {
    throw new Error("Google OAuth can only be initiated from client-side");
  }

  const supabase = getSupabaseClient();
  
  if (!supabase) {
    logger.error("[Google OAuth] Supabase client not available");
    throw new Error("Authentication service unavailable");
  }

  // Use NEXT_PUBLIC_APP_URL if available, otherwise use window.location.origin
  // Swiggy Dec 2025 pattern: Environment-aware URL handling
  // Access env safely - it might not be initialized during SSR
  let baseUrl: string;
  try {
    baseUrl = env.NEXT_PUBLIC_APP_URL || window.location.origin;
  } catch (error) {
    // Fallback to window.location.origin if env module fails
    baseUrl = window.location.origin;
  }
  
  const redirectTo = returnUrl 
    ? `${baseUrl}/api/auth/google/callback?state=${encodeURIComponent(returnUrl)}`
    : `${baseUrl}/api/auth/google/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    logger.error("[Google OAuth] Sign-in failed", { error: error.message });
    throw new Error(error.message || "Failed to initiate Google sign-in");
  }

  if (!data?.url) {
    logger.error("[Google OAuth] No redirect URL returned from Supabase");
    throw new Error("Failed to get OAuth redirect URL. Please check Supabase Google OAuth configuration.");
  }

  return data.url;
}

