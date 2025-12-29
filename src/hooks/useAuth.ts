"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import type { User } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  phone: string;
  role: string;
}

interface UseAuthResult {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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
 * Get dev auth from cookies (browser-side)
 */
function getDevAuthFromCookies(): AuthUser | null {
  if (typeof window === "undefined") return null;
  
  const cookies = document.cookie.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
    const devUserId = cookies["dev_auth_user_id"];
    const devRole = cookies["dev_auth_role"];
    
    if (devUserId && devRole) {
      // Use the same UUID logic as server-side for consistency
      const finalId = devUserId.length < 36 ? "00000000-0000-0000-0000-000000000001" : devUserId;
      
      return {
        id: finalId,
        email: `${devRole}@example.com`,
        name: `Test ${devRole}`,
        phone: "+919876543210",
        role: devRole,
      };
    }
  
  return null;
}

/**
 * useAuth hook using Supabase Auth
 * Swiggy Dec 2025 pattern: Simple, clean auth hook with Supabase
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async () => {
    // Don't fetch on server-side
    if (typeof window === "undefined") {
      setLoading(false);
      setUser(null);
      return;
    }

    // DEV BYPASS: Check for dev auth cookies first
    const devUser = getDevAuthFromCookies();
    if (devUser) {
      logger.debug("[useAuth] Using dev bypass from cookies", { role: devUser.role });
      setUser(devUser);
      setLoading(false);
      return;
    }

    // EMERGENCY BYPASS: If in development and specifically requested to bypass auth
    if (process.env.NODE_ENV === "development") {
      // Auto-login as vendor for vendor routes if no session found
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/vendor")) {
        logger.debug("[useAuth] Auto-assigning vendor role for dev testing");
        setUser({
          id: "dev-vendor-id",
          email: "vendor@example.com",
          name: "Dev Partner",
          phone: "+910000000000",
          role: "vendor",
        });
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      if (!supabase) {
        logger.warn("[useAuth] Supabase client not available");
        setUser(null);
        setLoading(false);
        return;
      }

      // Get session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        logger.error("[useAuth] Failed to get session", sessionError);
        setError(sessionError.message);
        setUser(null);
        return;
      }

      if (session?.user) {
        const authUser = mapSupabaseUser(session.user);
        setUser(authUser);
      } else {
        setUser(null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("[useAuth] Failed to get session", err);
      setError(errorMessage);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();

    // Listen to auth state changes for real-time updates
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug("[useAuth] Auth state changed", event);
      
      // If we have a dev user from cookies, don't let Supabase state change overwrite it
      // unless it's a real sign-in event
      const devUser = getDevAuthFromCookies();
      if (devUser && event !== "SIGNED_IN") {
        logger.debug("[useAuth] Preserving dev user despite auth state change", event);
        setUser(devUser);
        setLoading(false);
        return;
      }

      if (session?.user) {
        const authUser = mapSupabaseUser(session.user);
        setUser(authUser);
        setError(null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    loading,
    error,
    refetch: fetchSession,
  };
}

