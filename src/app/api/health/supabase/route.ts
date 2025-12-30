import { NextResponse } from "next/server";
import { getSupabaseHealthStatus } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/health/supabase
 * Returns comprehensive Supabase health status
 * Useful for monitoring dashboards and debugging
 */
export async function GET() {
  try {
    // Swiggy Dec 2025 pattern: Use logger directly - if it fails, let it fail
    logger.debug("[API /health/supabase] Health check requested");
    
    const status = await getSupabaseHealthStatus();
    
    // Return appropriate status code based on health
    const statusCode = status.healthy ? 200 : 503;
    
    return NextResponse.json(status, { status: statusCode });
  } catch (error) {
    // Enhanced error handling with detailed information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof Error ? error.constructor.name : typeof error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Swiggy Dec 2025 pattern: Use logger directly - if it fails, let it fail
    logger.error("[API /health/supabase] Health check failed", error);
    
    return NextResponse.json(
      {
        healthy: false,
        clientAvailable: false,
        connectionWorking: false,
        realtimeEnabled: false,
        details: {
          error: errorMessage,
          errorType,
          ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {}),
        },
      },
      { status: 503 }
    );
  }
}


