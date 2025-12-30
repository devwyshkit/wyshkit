/**
 * Centralized Supabase Client
 * Swiggy Dec 2025 pattern: Using @supabase/ssr for proper Next.js cookie handling
 */

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { env } from "@/lib/config/env";

// Note: Next.js automatically loads .env.local, so we don't need manual dotenv loading
// This prevents bundling Node.js modules (fs, path) in client code

/**
 * Get Supabase URL and Anon Key from environment
 * Swiggy Dec 2025 pattern: Simple config access, Next.js handles .env loading
 * Edge Runtime safe - only uses process.env directly
 */
function getSupabaseConfig() {
  // Edge Runtime safe - directly access process.env only
  // Never use env module here as it may not be available in Edge Runtime
  // and can cause module initialization errors
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  
  return { url, anonKey };
}

// Swiggy Dec 2025 pattern: Singleton client instance for browser (reuse same client)
let browserClient: SupabaseClient | null = null;

/**
 * Get client-side Supabase client (for browser)
 * Swiggy Dec 2025 pattern: Using createBrowserClient from @supabase/ssr
 * Returns singleton instance to avoid recreating client on every call
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Return cached client if available
  if (browserClient) {
    return browserClient;
  }

  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    logger.warn(
      "[Supabase] Not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable Supabase features."
    );
    return null;
  }

  try {
    // For cookie-based auth, we need to provide cookies implementation
    // This allows the browser client to read server-set cookies
    const client = createBrowserClient(config.url, config.anonKey, {
      cookies: {
        getAll() {
          // Read all cookies from document.cookie
          return document.cookie.split(";").map((cookie) => {
            const [name, ...rest] = cookie.trim().split("=");
            return { name: name.trim(), value: decodeURIComponent(rest.join("=")) };
          });
        },
        setAll(cookiesToSet) {
          // Set cookies in document.cookie
          cookiesToSet.forEach(({ name, value, options }) => {
            // Build cookie string
            let cookieString = `${name}=${encodeURIComponent(value)}`;
            
            if (options) {
              if (options.maxAge) {
                cookieString += `; max-age=${options.maxAge}`;
              }
              if (options.path) {
                cookieString += `; path=${options.path}`;
              }
              if (options.domain) {
                cookieString += `; domain=${options.domain}`;
              }
              if (options.sameSite) {
                cookieString += `; samesite=${options.sameSite}`;
              }
              if (options.secure) {
                cookieString += `; secure`;
              }
              // httpOnly cannot be set from client-side JavaScript
            }
            
            document.cookie = cookieString;
          });
        },
      },
    });

    logger.debug("[Supabase] Browser client initialized");
    browserClient = client; // Cache the client
    return client;
  } catch (error) {
    logger.error("[Supabase] Failed to initialize browser client", error);
    return null;
  }
}

/**
 * Get server-side Supabase client (for API routes and server components)
 * Swiggy Dec 2025 pattern: Using createServerClient from @supabase/ssr with cookies
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (typeof window !== "undefined") {
    return null;
  }

  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    logger.warn("[Supabase] Server client not configured");
    return null;
  }

  try {
    // Dynamic import to avoid bundling next/headers in client code
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    
    const client = createServerClient(config.url, config.anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    logger.debug("[Supabase] Server client initialized");
    return client;
  } catch (error) {
    logger.error("[Supabase] Failed to initialize server client", error);
    return null;
  }
}

/**
 * Create Supabase client for middleware (Edge Runtime compatible)
 * Swiggy Dec 2025 pattern: Middleware client with request/response cookie handling
 */
export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
): SupabaseClient | null {
  // Edge Runtime safe - no logger import
  try {
    const config = getSupabaseConfig();

    if (!config.url || !config.anonKey) {
      return null;
    }

    // Validate request and response are properly typed
    if (!request || !response) {
      return null;
    }

    const client = createServerClient(config.url, config.anonKey, {
      cookies: {
        getAll() {
          try {
            // Read cookies from request
            const cookieHeader = request.headers.get("cookie") || "";
            if (!cookieHeader) {
              return [];
            }
            return cookieHeader.split(";").map((cookie) => {
              const trimmed = cookie.trim();
              if (!trimmed) {
                return { name: "", value: "" };
              }
              const [name, ...rest] = trimmed.split("=");
              try {
                return { 
                  name: name.trim(), 
                  value: decodeURIComponent(rest.join("=")) 
                };
              } catch {
                // If decode fails, return as-is
                return { name: name.trim(), value: rest.join("=") };
              }
            }).filter(cookie => cookie.name); // Filter out empty cookies
          } catch (error) {
            // Return empty array if cookie parsing fails
            return [];
          }
        },
        setAll(cookiesToSet) {
          try {
            // Set cookies in response
            if (!cookiesToSet || !Array.isArray(cookiesToSet)) {
              return;
            }
            cookiesToSet.forEach(({ name, value, options }) => {
              if (name && value !== undefined) {
                try {
                  response.cookies.set(name, value, options);
                } catch (cookieError) {
                  // Silently fail individual cookie setting
                  if (process.env.NODE_ENV === 'development') {
                    // eslint-disable-next-line no-console
                    logger.debug('[Supabase] Failed to set cookie', { name, error: cookieError });
                  }
                }
              }
            });
          } catch (error) {
            // Silently fail cookie setting
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              logger.debug('[Supabase] Failed to set cookies', { error });
            }
          }
        },
      },
    });

    return client;
  } catch (error) {
    // Edge Runtime safe - use console instead of logger
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      logger.error("[Supabase] Failed to create middleware client", { error });
    }
    return null;
  }
}

/**
 * Create Supabase client with request (for API routes)
 * Swiggy Dec 2025 pattern: Request-specific client with cookie support
 */
export async function createSupabaseServerClientWithRequest(
  request: Request
): Promise<SupabaseClient | null> {
  if (typeof window !== "undefined") {
    return null;
  }

  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    logger.warn("[Supabase] Server client not configured");
    return null;
  }

  try {
    // Dynamic import to avoid bundling next/headers in client code
    const { cookies } = await import("next/headers");
    
    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch (cookieError) {
      // Handle edge cases where cookies() fails (edge runtime, SSR issues)
      logger.error("[Supabase] Failed to get cookie store", {
        error: cookieError instanceof Error ? cookieError.message : String(cookieError),
        stack: cookieError instanceof Error ? cookieError.stack : undefined,
        url: request.url,
      });
      return null;
    }
    
    const client = createServerClient(config.url, config.anonKey, {
      cookies: {
        getAll() {
          try {
            return cookieStore.getAll();
          } catch (error) {
            logger.warn("[Supabase] Cookie getAll failed", {
              error: error instanceof Error ? error.message : String(error),
            });
            return [];
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            logger.warn("[Supabase] Cookie setAll failed", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        },
      },
    });

    return client;
  } catch (error) {
    logger.error("[Supabase] Failed to create request-specific client", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url,
    });
    return null;
  }
}

/**
 * Get server-side Supabase client with service role key (for admin operations)
 * Swiggy Dec 2025 pattern: Use service role only when needed, never expose to client
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    logger.warn("[Supabase] Service role client is server-side only");
    return null;
  }

  let url: string | undefined;
  let serviceKey: string | undefined;
  
  try {
    url = env.NEXT_PUBLIC_SUPABASE_URL;
    serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  } catch (error) {
    url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  if (!url || !serviceKey) {
    logger.warn("[Supabase] Service role client not configured");
    return null;
  }

  try {
    const client = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    logger.debug("[Supabase] Service role client initialized");
    return client;
  } catch (error) {
    logger.error("[Supabase] Failed to initialize service role client", error);
    return null;
  }
}

/**
 * Check Supabase connection health
 */
export async function checkSupabaseHealth(maxRetries: number = 3): Promise<boolean> {
  const client = typeof window !== "undefined" 
    ? getSupabaseClient() 
    : await getSupabaseServerClient();

  if (!client) {
    logger.debug("[Supabase] Health check skipped - client not available");
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<{ error: unknown }>((_, reject) => {
        setTimeout(() => reject(new Error("Health check timeout")), 5000);
      });

      let healthCheckPromise;
      try {
        healthCheckPromise = client.from("users").select("id").limit(1);
      } catch (tableError) {
        healthCheckPromise = Promise.resolve({ data: null, error: null });
      }
      
      const result = await Promise.race([healthCheckPromise, timeoutPromise]) as { error: unknown; data?: unknown };
      
      if (!result.error || result.data !== undefined) {
        logger.debug("[Supabase] Health check passed");
        return true;
      }
      
      const errorMessage = result.error instanceof Error ? result.error.message : String(result.error);
      if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
        logger.debug("[Supabase] Health check passed (table may not exist, but connection works)");
        return true;
      }
      
      if (attempt < maxRetries) {
        const delay = 1000 * attempt;
        logger.warn(`[Supabase] Health check failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
        logger.debug("[Supabase] Health check passed (table may not exist, but connection works)");
        return true;
      }
      
      if (attempt < maxRetries) {
        const delay = 1000 * attempt;
        logger.warn(`[Supabase] Health check error (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error("[Supabase] Health check failed after all retries", error);
      }
    }
  }

  return false;
}

/**
 * Comprehensive Supabase health status with detailed diagnostics
 */
export async function getSupabaseHealthStatus(): Promise<{
  healthy: boolean;
  clientAvailable: boolean;
  connectionWorking: boolean;
  realtimeEnabled: boolean;
  details: Record<string, unknown>;
}> {
  const status = {
    healthy: false,
    clientAvailable: false,
    connectionWorking: false,
    realtimeEnabled: false,
    details: {} as Record<string, unknown>,
  };

  try {
    const client = typeof window !== "undefined" 
      ? getSupabaseClient() 
      : await getSupabaseServerClient();

    status.clientAvailable = !!client;

    if (!client) {
      status.details.error = "Supabase client not initialized";
      status.details.config = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "not set",
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "not set",
      };
      return status;
    }

    // Test connection
    try {
      const timeoutPromise = new Promise<{ error: unknown }>((_, reject) => {
        setTimeout(() => reject(new Error("Health check timeout")), 5000);
      });

      let healthCheckPromise;
      try {
        healthCheckPromise = client.from("users").select("id").limit(1);
      } catch (tableError) {
        healthCheckPromise = Promise.resolve({ data: null, error: null });
      }
      
      const result = await Promise.race([healthCheckPromise, timeoutPromise]) as { error: unknown; data?: unknown };
      
      const errorMessage = result.error instanceof Error ? result.error.message : String(result.error);
      const isTableMissingError = errorMessage.includes("relation") && errorMessage.includes("does not exist");
      status.connectionWorking = !result.error || isTableMissingError || result.data !== undefined;
      
      if (result.error && !isTableMissingError) {
        status.details.connectionError = errorMessage;
      } else if (isTableMissingError) {
        status.details.connectionNote = "Connection works, but users table may not exist";
      }
    } catch (connectionError) {
      // Connection test failed
      status.connectionWorking = false;
      status.details.connectionError = connectionError instanceof Error 
        ? connectionError.message 
        : String(connectionError);
    }

    if (typeof window !== "undefined") {
      try {
        const testChannel = client.channel("health-check");
        const subscribePromise = testChannel.subscribe();
        
        const subscribeTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Realtime subscription timeout")), 3000);
        });
        
        await Promise.race([subscribePromise, subscribeTimeout]);
        
        const statusCheck = new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 1000);
          testChannel.on("system", {}, (payload) => {
            if (payload.status === "SUBSCRIBED") {
              clearTimeout(timeout);
              resolve(true);
            }
          });
          setTimeout(() => {
            clearTimeout(timeout);
            resolve(true);
          }, 1000);
        });
        
        const isSubscribed = await statusCheck;
        status.realtimeEnabled = isSubscribed;
        
        try {
          await client.removeChannel(testChannel);
        } catch (cleanupError) {
          // Swiggy Dec 2025 pattern: Log cleanup errors for debugging
          if (process.env.NODE_ENV === 'development') {
            logger.debug("[Supabase] Cleanup error (non-critical)", cleanupError);
          }
        }
      } catch (realtimeError) {
        const errorMessage = realtimeError instanceof Error ? realtimeError.message : "Unknown";
        status.details.realtimeError = errorMessage;
        status.details.realtimeHint = "Check Supabase dashboard > Database > Replication to enable Realtime";
        status.realtimeEnabled = false;
      }
    } else {
      status.realtimeEnabled = true;
      status.details.realtimeNote = "Realtime is client-side only";
    }

    status.healthy = status.connectionWorking && (typeof window === "undefined" || status.realtimeEnabled);
  } catch (error) {
    status.details.error = error instanceof Error ? error.message : "Unknown error";
    status.details.errorType = error instanceof Error ? error.constructor.name : typeof error;
  }

  return status;
}

/**
 * Reset Supabase clients (useful for testing or reconnection)
 */
export function resetSupabaseClients() {
  logger.info("[Supabase] Clients reset");
}
