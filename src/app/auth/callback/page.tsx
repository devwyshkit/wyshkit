"use client";

/**
 * OAuth Callback Handler (Client-side)
 * Handles OAuth callbacks with tokens in URL fragment (hash)
 * This is needed when Supabase uses implicit flow or when redirect URL doesn't match exactly
 */

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Get return URL from state parameter (if provided)
  const returnUrlState = searchParams.get("state");

  useEffect(() => {
    // Only run once on mount - use ref to prevent multiple executions
    let isHandled = false;
    
    const handleOAuthCallback = async () => {
      if (isHandled) {
        logger.debug("[OAuth Callback] Already handling, skipping");
        return;
      }
      isHandled = true;
      
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error("Supabase client not available");
        }

        // Extract tokens from URL fragment
        // Fragment is client-side only, so we can read it here
        const hash = window.location.hash.substring(1); // Remove '#'
        
        // If no hash, check if we were redirected here without tokens
        if (!hash) {
          logger.warn("[OAuth Callback] No hash in URL - may have been redirected incorrectly");
          setErrorMessage("No authentication data found. Please try signing in again.");
          setStatus("error");
          return;
        }
        
        const params = new URLSearchParams(hash);
        
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const error = params.get("error");
        const errorDescription = params.get("error_description");
        // Get state from URL fragment OR from query params (fallback)
        const state = params.get("state") || returnUrlState || null;

        // Handle OAuth errors
        if (error) {
          logger.error("[OAuth Callback] OAuth error in fragment", {
            error,
            errorDescription,
          });
          setErrorMessage(errorDescription || error || "OAuth authentication failed");
          setStatus("error");
          return;
        }

        // Check if we have tokens
        if (!accessToken) {
          logger.error("[OAuth Callback] No access token in fragment");
          setErrorMessage("No access token received. Please try signing in again.");
          setStatus("error");
          return;
        }

        // Set session using tokens
        // For fragment-based flow, we use the browser client to set the session
        // This will automatically sync with cookies via @supabase/ssr cookie store
        // setSession accepts { access_token, refresh_token } format
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        });

        if (sessionError || !sessionData.session) {
          logger.error("[OAuth Callback] Failed to set session", {
            error: sessionError?.message,
            code: sessionError?.code,
          });
          setErrorMessage(sessionError?.message || "Failed to create session. Please try again.");
          setStatus("error");
          return;
        }

        logger.info("[OAuth Callback] Session set successfully", {
          userId: sessionData.user?.id,
        });

        // Sync user to database
        setIsSyncing(true);
        try {
          const syncResponse = await fetch("/api/auth/sync-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: sessionData.user?.id,
              email: sessionData.user?.email,
              name: sessionData.user?.user_metadata?.full_name || 
                    sessionData.user?.user_metadata?.name ||
                    sessionData.user?.email?.split("@")[0] ||
                    "User",
            }),
          });

          if (!syncResponse.ok) {
            const errorData = await syncResponse.json();
            logger.warn("[OAuth Callback] User sync failed (non-critical)", {
              error: errorData.error,
            });
            // Don't fail the auth flow if sync fails - user is still authenticated
          }
        } catch (syncError) {
          logger.warn("[OAuth Callback] User sync error (non-critical)", syncError);
          // Continue anyway - user is authenticated
        } finally {
          setIsSyncing(false);
        }

        setStatus("success");

        // Get return URL from state or default to home
        const returnUrl = state ? decodeURIComponent(state) : "/";

        // Clear URL fragment and redirect
        window.history.replaceState(null, "", window.location.pathname);
        
        // Small delay to show success state
        setTimeout(() => {
          router.push(returnUrl);
          router.refresh();
        }, 500);
      } catch (error) {
        logger.error("[OAuth Callback] Callback handler failed", error);
        const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred";
        setErrorMessage(errorMsg);
        setStatus("error");
      }
    };

    handleOAuthCallback();
  }, [router, returnUrlState, searchParams]);

  if (status === "processing" || isSyncing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <div>
            <p className="text-lg font-medium">Completing sign in...</p>
            {isSyncing && (
              <p className="text-sm text-muted-foreground mt-2">Syncing your account</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-8 h-8 mx-auto text-green-500" />
          <div>
            <p className="text-lg font-medium">Sign in successful!</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Sign in failed</h2>
          <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => router.push("/login")} variant="default">
            Try again
          </Button>
          <Button onClick={() => router.push("/")} variant="outline">
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-lg font-medium">Loading...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}

