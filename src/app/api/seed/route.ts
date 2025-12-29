import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/seed";
import { logger } from "@/lib/utils/logger";
import { env } from "@/lib/config/env";

/**
 * POST /api/seed
 * Database seeding endpoint (dev only)
 * Seeds database with initial data for development/testing
 */
export async function POST(request: Request) {
  // Only allow in development
  if (env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Seeding is not allowed in production" },
      { status: 403 }
    );
  }

  try {
    logger.info("[API /seed] Starting database seed...");
    await seedDatabase();
    logger.info("[API /seed] Database seed completed successfully");
    
    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
    });
  } catch (error) {
    logger.error("[API /seed] Failed to seed database", error);
    return NextResponse.json(
      {
        error: "Failed to seed database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



