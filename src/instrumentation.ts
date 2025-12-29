/**
 * Next.js 15 Instrumentation
 * Runs on server startup to initialize monitoring and services
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize error tracking (Sentry)
    try {
      const { initializeErrorTracking } = await import("@/lib/services/error-tracking");
      initializeErrorTracking();
    } catch (error) {
      // Silently fail if error tracking not available
      console.error("[Instrumentation] Failed to initialize error tracking", error);
    }
  }
}


