import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashbackConfig } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { normalizeQueryParam } from "@/lib/utils/api-helpers";
import { appConfig } from "@/lib/config/app";
import { requireRole } from "@/lib/auth/server";
import { isAuthError, formatApiError } from "@/lib/types/api-errors";
import { isDevelopment } from "@/lib/config/env";

/**
 * GET /api/cashback/config
 * Fetch active cashback configuration
 * Returns: global config + category/vendor overrides
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = normalizeQueryParam(searchParams.get("categoryId"));
    const vendorId = normalizeQueryParam(searchParams.get("vendorId"));

    if (db) {
      // Fetch global config
      const [globalConfig] = await db
        .select()
        .from(cashbackConfig)
        .where(and(eq(cashbackConfig.type, "global"), eq(cashbackConfig.isActive, true)))
        .limit(1);

      // Fetch category override if categoryId provided
      let categoryOverride = null;
      if (categoryId) {
        const [override] = await db
          .select()
          .from(cashbackConfig)
          .where(
            and(
              eq(cashbackConfig.type, "category"),
              eq(cashbackConfig.entityId, categoryId),
              eq(cashbackConfig.isActive, true)
            )
          )
          .limit(1);
        categoryOverride = override;
      }

      // Fetch vendor override if vendorId provided
      let vendorOverride = null;
      if (vendorId) {
        const [override] = await db
          .select()
          .from(cashbackConfig)
          .where(
            and(
              eq(cashbackConfig.type, "vendor"),
              eq(cashbackConfig.entityId, vendorId),
              eq(cashbackConfig.isActive, true)
            )
          )
          .limit(1);
        vendorOverride = override;
      }

      // Determine effective cashback percentage (vendor > category > global > default)
      let effectivePercentage = appConfig.cashback.rate; // Default 10%
      if (globalConfig) {
        effectivePercentage = parseFloat(globalConfig.percentage);
      }
      if (categoryOverride) {
        effectivePercentage = parseFloat(categoryOverride.percentage);
      }
      if (vendorOverride) {
        effectivePercentage = parseFloat(vendorOverride.percentage);
      }

      return NextResponse.json({
        percentage: effectivePercentage,
        global: globalConfig ? parseFloat(globalConfig.percentage) : appConfig.cashback.rate,
        category: categoryOverride ? parseFloat(categoryOverride.percentage) : null,
        vendor: vendorOverride ? parseFloat(vendorOverride.percentage) : null,
      });
    }

    // Fallback to app config if database not available
    return NextResponse.json({
      percentage: appConfig.cashback.rate,
      global: appConfig.cashback.rate,
      category: null,
      vendor: null,
    });
  } catch (error) {
    logger.error("[API /cashback/config] Error", error);
    return NextResponse.json(
      { error: "Failed to fetch cashback config", percentage: appConfig.cashback.rate },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cashback/config
 * Admin-only: Update cashback configuration
 */
export async function POST(request: Request) {
  try {
    // Require admin role
    await requireRole(request, "admin");
    const body = await request.json();
    const { type, entityId, percentage, isActive } = body;

    if (!db) {
      if (isDevelopment) {
        logger.warn("[API /cashback/config] Development mode: Using mock config update (database not available)");
        return NextResponse.json({ success: true, _devMode: true });
      }
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    // Validate
    if (!type || !["global", "category", "vendor"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (type !== "global" && !entityId) {
      return NextResponse.json({ error: "entityId required for category/vendor type" }, { status: 400 });
    }

    if (percentage < 0 || percentage > 100) {
      return NextResponse.json({ error: "Percentage must be between 0 and 100" }, { status: 400 });
    }

    // Update or insert
    const [existing] = await db
      .select()
      .from(cashbackConfig)
      .where(
        and(
          eq(cashbackConfig.type, type),
          entityId ? eq(cashbackConfig.entityId, entityId) : eq(cashbackConfig.entityId, null as any)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(cashbackConfig)
        .set({
          percentage: percentage.toString(),
          isActive: isActive !== undefined ? isActive : true,
          updatedAt: new Date(),
        })
        .where(eq(cashbackConfig.id, existing.id));
    } else {
      // Insert new
      await db.insert(cashbackConfig).values({
        type,
        entityId: entityId || null,
        percentage: percentage.toString(),
        isActive: isActive !== undefined ? isActive : true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle authentication errors
    if (isAuthError(error)) {
      logger.warn("[API /cashback/config] Authentication required for admin action");
      return NextResponse.json(
        { error: "Admin access required. You do not have permission to modify cashback configuration." },
        { status: 403 }
      );
    }
    
    logger.error("[API /cashback/config] Error updating config", error);
    const errorResponse = formatApiError(error);
    return NextResponse.json(
      { 
        error: errorResponse.error || "Unable to update cashback configuration. Please try again. If the problem persists, contact support.",
        code: "CASHBACK_CONFIG_UPDATE_FAILED"
      },
      { status: 500 }
    );
  }
}


