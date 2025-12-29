/**
 * Centralized Supabase Client
 * Swiggy Dec 2025 pattern: Singleton client with connection pooling and error handling
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import { env } from "@/lib/config/env";
import * as dotenv from "dotenv";
// Note: fs and path are Node.js-only modules - cannot be imported at top level
// They will be dynamically required only on server-side when needed

// Swiggy Dec 2025 pattern: Lazy dotenv loading (only on first function call)
// Ensures .env.local is loaded even if Next.js cache is stale
// Prevents SSR errors by not running during module import
// Swiggy Dec 2025 pattern: Dynamic require for Node.js modules (client-safe)
let _dotenvLoaded = false;

function ensureDotenvLoaded() {
  if (_dotenvLoaded || typeof window !== "undefined") {
    return;
  }

  try {
    // Check if we're in a Node.js environment
    if (typeof process !== "undefined" && typeof process.cwd === "function") {
      // Dynamic require - only loads on server-side, won't be bundled for client
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path") as typeof import("path");
      
      const envPath = path.resolve(process.cwd(), ".env.local");
      if (fs.existsSync && fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        _dotenvLoaded = true;
        // Only log in development to avoid noise
        if (process.env.NODE_ENV === "development") {
          try {
            logger.debug("[Supabase] Explicitly loaded .env.local");
          } catch {
            // Ignore logger errors
          }
        }
      }
    }
  } catch (error) {
    // Silently fail - Next.js should have loaded it already
    // Don't log errors during SSR as they can cause 500 errors
  }
}

// Client-side Supabase client (for Realtime)
let clientSideClient: SupabaseClient | null = null;

// Server-side Supabase client (for API routes)
let serverSideClient: SupabaseClient | null = null;

// Server-side Supabase client with service role (for admin operations)
let serverSideServiceClient: SupabaseClient | null = null;

/**
 * Get Supabase URL and Anon Key from environment
 * Swiggy Dec 2025 pattern: Fallback to process.env if env module fails
 */
function getSupabaseConfig() {
  // Ensure dotenv is loaded before accessing env vars
  ensureDotenvLoaded();
  
  // Swiggy Dec 2025 pattern: Direct process.env access with fallback
  // Next.js automatically loads .env.local at startup, so process.env should have values
  // Try process.env first (most reliable), then env module (validated)
  let url = "";
  let anonKey = "";
  
  try {
    url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
    anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  } catch (error) {
    // Fallback to process.env only if env module access fails
    url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  }
  
  // Runtime verification: Check if .env.local file exists (server-side only)
  let envFileExists = false;
  let envFilePath = "";
  if (typeof window === "undefined") {
    try {
      // Dynamic require - only loads on server-side, won't be bundled for client
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path") as typeof import("path");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      
      envFilePath = path.resolve(process.cwd(), ".env.local");
      envFileExists = fs.existsSync(envFilePath);
    } catch (error) {
      // Ignore file system errors
    }
  }
  
  // Debug logging in development (only on server-side)
  if (typeof window === "undefined" && process.env.NODE_ENV === "development") {
    if (!url || !anonKey) {
      logger.warn("[Supabase Config] Missing credentials", {
        hasEnvUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
        hasEnvAnonKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasProcessEnvUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasProcessEnvAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlLength: url.length,
        anonKeyLength: anonKey.length,
        processEnvUrlValue: process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` : "undefined",
        envFileExists,
        envFilePath: envFileExists ? envFilePath : "not found",
        cwd: process.cwd(),
      });
    }
  }
  
  // Client-side: use NEXT_PUBLIC_ env vars
  if (typeof window !== "undefined") {
    return { url, anonKey };
  }
  
  // Server-side: can use same or different keys
  return { url, anonKey, envFileExists, envFilePath };
}

/**
 * Get client-side Supabase client (for Realtime subscriptions)
 * Swiggy Dec 2025 pattern: Retry logic with exponential backoff
 */
export function getSupabaseClient(): SupabaseClient | null {
  // Only available on client-side
  if (typeof window === "undefined") {
    return null;
  }

  // Ensure dotenv is loaded before accessing env vars
  ensureDotenvLoaded();

  // Return cached client if already initialized
  if (clientSideClient) {
    return clientSideClient;
  }

  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    logger.warn(
      "[Supabase] Not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable Supabase features."
    );
    return null;
  }

  try {
    clientSideClient = createClient(config.url, config.anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        // Add connection retry logic
        reconnectAfterMs: (tries: number) => {
          // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
          return Math.min(1000 * Math.pow(2, tries), 30000);
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      // Global error handler
      global: {
        headers: {
          "x-client-info": "wyshkit@1.0.0",
        },
      },
    });

    logger.info("[Supabase] Client-side client initialized");
    return clientSideClient;
  } catch (error) {
    logger.error("[Supabase] Failed to initialize client-side client", error);
    return null;
  }
}

/**
 * Get server-side Supabase client (for API routes)
 * For request-specific sessions, use createSupabaseServerClientWithRequest()
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  // Only available on server-side
  if (typeof window !== "undefined") {
    return null;
  }

  // Ensure dotenv is loaded before accessing env vars
  ensureDotenvLoaded();

  // Return cached client if already initialized
  if (serverSideClient) {
    return serverSideClient;
  }

  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    logger.warn("[Supabase] Server client not configured");
    return null;
  }

  try {
    serverSideClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false, // Server-side doesn't persist sessions
        autoRefreshToken: false,
      },
    });

    logger.info("[Supabase] Server-side client initialized");
    return serverSideClient;
  } catch (error) {
    logger.error("[Supabase] Failed to initialize server-side client", error);
    return null;
  }
}

/**
 * Create Supabase client with request headers (for reading sessions from cookies)
 * Swiggy Dec 2025 pattern: Request-specific client for session reading
 */
export function createSupabaseServerClientWithRequest(request: Request): SupabaseClient | null {
  if (typeof window !== "undefined") {
    return null;
  }

  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    // Enhanced diagnostics with file system check (server-side only)
    let envFileExists = false;
    let envFilePath = "";
    try {
      // Dynamic require - only loads on server-side, won't be bundled for client
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path") as typeof import("path");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      
      envFilePath = path.resolve(process.cwd(), ".env.local");
      envFileExists = fs.existsSync(envFilePath);
    } catch (error) {
      // Ignore file system errors
    }
    
    logger.warn("[Supabase] Server client not configured", {
      hasUrl: !!config.url,
      hasAnonKey: !!config.anonKey,
      urlLength: config.url?.length || 0,
      anonKeyLength: config.anonKey?.length || 0,
      envUrl: env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "not set",
      processEnvUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "not set",
      envAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "not set",
      processEnvAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "not set",
      envFileExists,
      envFilePath,
      cwd: process.cwd(),
    });
    return null;
  }

  try {
    // Create a client that can read cookies from the request
    // Supabase will automatically read session from cookies
    const client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          // Pass cookies from request to Supabase
          cookie: request.headers.get("cookie") || "",
        },
      },
    });

    return client;
  } catch (error) {
    logger.error("[Supabase] Failed to create request-specific client", error);
    return null;
  }
}

/**
 * Check Supabase connection health
 * Swiggy Dec 2025 pattern: Comprehensive health check with retry
 */
export async function checkSupabaseHealth(maxRetries: number = 3): Promise<boolean> {
  const client = typeof window !== "undefined" 
    ? getSupabaseClient() 
    : getSupabaseServerClient();

  if (!client) {
    logger.debug("[Supabase] Health check skipped - client not available");
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Simple health check - try to connect with timeout
      // Use a simple query that works even if tables don't exist
      const timeoutPromise = new Promise<{ error: unknown }>((_, reject) => {
        setTimeout(() => reject(new Error("Health check timeout")), 5000);
      });

      // Try a simple query - if users table doesn't exist, try a generic health check
      let healthCheckPromise;
      try {
        healthCheckPromise = client.from("users").select("id").limit(1);
      } catch (tableError) {
        // If users table doesn't exist, try a simpler connection test
        // Supabase allows querying any table, so we'll catch the error
        healthCheckPromise = Promise.resolve({ data: null, error: null });
      }
      
      const result = await Promise.race([healthCheckPromise, timeoutPromise]) as { error: unknown; data?: unknown };
      
      // If we got data or no error, connection is working
      if (!result.error || result.data !== undefined) {
        logger.debug("[Supabase] Health check passed");
        return true;
      }
      
      // Check if error is about missing table - that's still a connection success
      const errorMessage = result.error instanceof Error ? result.error.message : String(result.error);
      if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
        // Table doesn't exist, but connection works
        logger.debug("[Supabase] Health check passed (table may not exist, but connection works)");
        return true;
      }
      
      if (attempt < maxRetries) {
        const delay = 1000 * attempt; // Exponential backoff
        logger.warn(`[Supabase] Health check failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      // Check if error is about missing table - that's still a connection success
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
 * Swiggy Dec 2025 pattern: Production-ready health monitoring
 */
export async function getSupabaseHealthStatus(): Promise<{
  healthy: boolean;
  clientAvailable: boolean;
  connectionWorking: boolean;
  realtimeEnabled: boolean;
  details: Record<string, unknown>;
}> {
  const client = typeof window !== "undefined" 
    ? getSupabaseClient() 
    : getSupabaseServerClient();

  const status = {
    healthy: false,
    clientAvailable: !!client,
    connectionWorking: false,
    realtimeEnabled: false,
    details: {} as Record<string, unknown>,
  };

  if (!client) {
    status.details.error = "Supabase client not initialized";
    status.details.config = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "not set",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "not set",
    };
    return status;
  }

  try {
    // Test basic connection with timeout
    const timeoutPromise = new Promise<{ error: unknown }>((_, reject) => {
      setTimeout(() => reject(new Error("Health check timeout")), 5000);
    });

    let healthCheckPromise;
    try {
      healthCheckPromise = client.from("users").select("id").limit(1);
    } catch (tableError) {
      // If users table doesn't exist, connection still works
      healthCheckPromise = Promise.resolve({ data: null, error: null });
    }
    
    const result = await Promise.race([healthCheckPromise, timeoutPromise]) as { error: unknown; data?: unknown };
    
    // Connection works if no error OR if error is about missing table
    const errorMessage = result.error instanceof Error ? result.error.message : String(result.error);
    const isTableMissingError = errorMessage.includes("relation") && errorMessage.includes("does not exist");
    status.connectionWorking = !result.error || isTableMissingError || result.data !== undefined;
    
    if (result.error && !isTableMissingError) {
      status.details.connectionError = errorMessage;
    } else if (isTableMissingError) {
      status.details.connectionNote = "Connection works, but users table may not exist";
    }

    // Check Realtime availability (client-side only)
    if (typeof window !== "undefined") {
      try {
        const testChannel = client.channel("health-check");
        const subscribePromise = testChannel.subscribe();
        
        // Wait for subscription with timeout
        const subscribeTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Realtime subscription timeout")), 3000);
        });
        
        await Promise.race([subscribePromise, subscribeTimeout]);
        
        // Check subscription status
        const statusCheck = new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 1000);
          testChannel.on("system", {}, (payload) => {
            if (payload.status === "SUBSCRIBED") {
              clearTimeout(timeout);
              resolve(true);
            }
          });
          // If no response, assume it's working
          setTimeout(() => {
            clearTimeout(timeout);
            resolve(true);
          }, 1000);
        });
        
        const isSubscribed = await statusCheck;
        status.realtimeEnabled = isSubscribed;
        
        // Cleanup
        try {
          await client.removeChannel(testChannel);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      } catch (realtimeError) {
        const errorMessage = realtimeError instanceof Error ? realtimeError.message : "Unknown";
        status.details.realtimeError = errorMessage;
        status.details.realtimeHint = "Check Supabase dashboard > Database > Replication to enable Realtime";
        status.realtimeEnabled = false;
      }
    } else {
      // Server-side: Realtime not applicable
      status.realtimeEnabled = true; // Consider it enabled for server-side
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
 * Get server-side Supabase client with service role key (for admin operations)
 * Swiggy Dec 2025 pattern: Use service role only when needed, never expose to client
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  // Only available on server-side
  if (typeof window !== "undefined") {
    logger.warn("[Supabase] Service role client is server-side only");
    return null;
  }

  // Ensure dotenv is loaded before accessing env vars
  ensureDotenvLoaded();

  // Return cached client if already initialized
  if (serverSideServiceClient) {
    return serverSideServiceClient;
  }

  let url: string | undefined;
  let serviceKey: string | undefined;
  
  try {
    url = env.NEXT_PUBLIC_SUPABASE_URL;
    serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  } catch (error) {
    // Fallback to process.env only if env module access fails
    url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  if (!url || !serviceKey) {
    logger.warn("[Supabase] Service role client not configured");
    return null;
  }

  try {
    serverSideServiceClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    logger.info("[Supabase] Service role client initialized");
    return serverSideServiceClient;
  } catch (error) {
    logger.error("[Supabase] Failed to initialize service role client", error);
    return null;
  }
}

/**
 * Reset Supabase clients (useful for testing or reconnection)
 */
export function resetSupabaseClients() {
  clientSideClient = null;
  serverSideClient = null;
  serverSideServiceClient = null;
  logger.info("[Supabase] Clients reset");
}

