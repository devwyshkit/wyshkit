import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/seed";
import { logger } from "@/lib/utils/logger";
import { env } from "@/lib/config/env";
import { requireAuth, AuthError } from "@/lib/auth/server";

/**
 * POST /api/seed
 * Database seeding endpoint (admin only, dev only)
 * Seeds database with initial data for development/testing
 * 
 * SECURITY: Requires admin authentication AND development environment
 * Swiggy Dec 2025 pattern: No default accounts, secure admin operations
 */
export async function POST(request: Request) {
  // Only allow in development - additional safeguard
  if (env.NODE_ENV === "production") {
    logger.warn("[API /seed] Attempted to seed in production - blocked");
    return NextResponse.json(
      { error: "Seeding is not allowed in production" },
      { status: 403 }
    );
  }

  try {
    // Require admin authentication
    const user = await requireAuth(request);
    
    // Verify user is admin
    if (user.role !== "admin") {
      logger.warn(`[API /seed] Non-admin user attempted to seed: ${user.id}`);
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    logger.info(`[API /seed] Admin ${user.id} starting database seed...`);
    await seedDatabase();
    logger.info(`[API /seed] Database seed completed successfully by admin ${user.id}`);
    
    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      logger.warn("[API /seed] Authentication required");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: error.status }
      );
    }

    logger.error("[API /seed] Failed to seed database", error);
    return NextResponse.json(
      {
        error: "Failed to seed database",
        details: env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}



