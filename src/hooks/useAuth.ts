"use client";

import { useState, useEffect, useRef } from "react";
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
 * useAuth hook using Supabase Auth
 * Swiggy Dec 2025 pattern: Simple, clean auth hook with Supabase
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null); // Track previous user ID to prevent unnecessary updates
  const isInitializingRef = useRef(false); // Prevent multiple INITIAL_SESSION events

  const fetchSession = async () => {
    // Don't fetch on server-side
    if (typeof window === "undefined") {
      setLoading(false);
      setUser(null);
      return;
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

      // Get session from Supabase (cookies are automatically read by createBrowserClient)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        logger.error("[useAuth] Failed to get session", sessionError);
        setError(sessionError.message);
        setUser(null);
        return;
      }

      if (session?.user) {
        const authUser = mapSupabaseUser(session.user);
        // Only update if user ID actually changed - prevent unnecessary re-renders
        if (previousUserIdRef.current !== authUser.id) {
          setUser(authUser);
          previousUserIdRef.current = authUser.id;
        }
      } else {
        // Only update if we had a user before - prevent unnecessary re-renders
        if (previousUserIdRef.current !== null) {
          setUser(null);
          previousUserIdRef.current = null;
        }
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
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      return;
    }
    isInitializingRef.current = true;

    fetchSession();

    // Listen to auth state changes for real-time updates
    const supabase = getSupabaseClient();
    if (!supabase) {
      isInitializingRef.current = false;
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug("[useAuth] Auth state changed", event);
      
      // Ignore duplicate INITIAL_SESSION events - Swiggy Dec 2025 pattern: Prevent cascading updates
      if (event === "INITIAL_SESSION" && previousUserIdRef.current !== null) {
        logger.debug("[useAuth] Ignoring duplicate INITIAL_SESSION event");
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        const authUser = mapSupabaseUser(session.user);
        // Only update if user ID actually changed - prevent unnecessary re-renders
        if (previousUserIdRef.current !== authUser.id) {
          setUser(authUser);
          previousUserIdRef.current = authUser.id;
          setError(null);
        }
      } else {
        // Only update if we had a user before - prevent unnecessary re-renders
        if (previousUserIdRef.current !== null) {
          setUser(null);
          previousUserIdRef.current = null;
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      isInitializingRef.current = false;
    };
  }, []);

  return {
    user,
    loading,
    error,
    refetch: fetchSession,
  };
}

