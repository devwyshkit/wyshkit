/**
 * Next.js 15 Instrumentation
 * Runs on server startup to initialize monitoring and services
 * Swiggy Dec 2025 pattern: Never crash server on initialization errors
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Wrap all initialization in try-catch to prevent server crashes
    try {
      // Initialize error tracking (Sentry)
      try {
        const { initializeErrorTracking } = await import("@/lib/services/error-tracking");
        initializeErrorTracking();
      } catch (error) {
        // Silently fail if error tracking not available
        // Use logger if available, otherwise console
        try {
          const { logger } = await import("@/lib/utils/logger");
          logger.error("[Instrumentation] Failed to initialize error tracking", error);
        } catch {
          // Fallback to console if logger also fails
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("[Instrumentation] Failed to initialize error tracking:", errorMessage);
        }
        // Continue server startup even if error tracking fails
      }

      // Add any other server initialization here
      // All should be wrapped in try-catch to prevent crashes
    } catch (error) {
      // Catch-all for any unexpected errors during instrumentation
      // Never throw - always allow server to start
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      try {
        const { logger } = await import("@/lib/utils/logger");
        logger.error("[Instrumentation] Unexpected error during initialization", {
          message: errorMessage,
          stack: errorStack,
        });
      } catch {
        console.error("[Instrumentation] Unexpected error during initialization:", errorMessage);
        if (errorStack && process.env.NODE_ENV === "development") {
          console.error("[Instrumentation] Stack trace:", errorStack);
        }
      }
      // Server will continue to start even if instrumentation fails
    }
  }
}


