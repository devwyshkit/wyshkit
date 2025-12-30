/**
 * Server-side authentication helpers
 * Utilities for getting current user from Supabase Auth session in API routes
 * Swiggy Dec 2025 pattern: Use Supabase Auth for server-side session management
 */

import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { getErrorMessage } from "@/lib/types/api-errors";
import type { User } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  phone: string;
  role: string;
}

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  status: number;
  
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

/**
 * Convert Supabase User to AuthUser
 */
function mapSupabaseUser(supabaseUser: User | null): AuthUser | null {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || null,
    name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || null,
    phone: supabaseUser.phone || supabaseUser.user_metadata?.phone || "",
    role: supabaseUser.user_metadata?.role || "customer",
  };
}

/**
 * Get current authenticated user from request
 * Returns null if not authenticated
 */
export async function getCurrentUser(request: Request): Promise<AuthUser | null> {
  try {
    // Create Supabase client with request headers to read session from cookies
    // With @supabase/ssr, cookies are automatically read from the cookie store
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      logger.warn("[Auth] Supabase client not available");
      return null;
    }

    // Get user from Supabase session
    // With @supabase/ssr, session is automatically read from cookies
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      logger.debug("[Auth] Failed to get user from session", error);
      return null;
    }

    return mapSupabaseUser(user);
  } catch (error: unknown) {
    // Catch any unexpected errors
    const errorMessage = error instanceof Error ? error.message : getErrorMessage(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : undefined;
    logger.error("[Auth] Unexpected error in getCurrentUser", {
      error: errorMessage,
      stack: errorStack,
      name: errorName,
    });
    return null;
  }
}

/**
 * Require authentication - returns 401 if not authenticated
 * Returns authenticated user or throws AuthError that should be caught and returned as NextResponse
 */
export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getCurrentUser(request);

  if (!user) {
    throw new AuthError("Authentication required", 401);
  }

  return user;
}

/**
 * Get user ID from session (convenience function)
 */
export async function getUserId(request: Request): Promise<string | null> {
  const user = await getCurrentUser(request);
  return user?.id || null;
}

/**
 * Check if user has specific role
 */
export async function requireRole(
  request: Request,
  role: string | string[]
): Promise<AuthUser> {
  const user = await requireAuth(request);
  const roles = Array.isArray(role) ? role : [role];

  if (!roles.includes(user.role)) {
    throw new AuthError("Insufficient permissions", 403);
  }

  return user;
}

