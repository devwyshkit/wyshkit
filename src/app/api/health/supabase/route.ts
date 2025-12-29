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
    logger.debug("[API /health/supabase] Health check requested");
    const status = await getSupabaseHealthStatus();
    
    // Return appropriate status code based on health
    const statusCode = status.healthy ? 200 : 503;
    
    return NextResponse.json(status, { status: statusCode });
  } catch (error) {
    logger.error("[API /health/supabase] Health check failed", error);
    return NextResponse.json(
      {
        healthy: false,
        clientAvailable: false,
        connectionWorking: false,
        realtimeEnabled: false,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      { status: 503 }
    );
  }
}


