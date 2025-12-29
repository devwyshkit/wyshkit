/**
 * Approve Vendor API
 * Swiggy Dec 2025 pattern: Simple approval workflow
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { isDevelopment } from "@/lib/config/env";

/**
 * PATCH /api/admin/vendors/[id]/approve - Approve a vendor
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);

    // Check admin role
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!db) {
      if (isDevelopment) {
        logger.warn("[API /admin/vendors/[id]/approve] Development mode: Mock approval");
        return NextResponse.json({ success: true, _devMode: true });
      }
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    // Update vendor status
    const [updatedVendor] = await db
      .update(vendors)
      .set({
        status: "approved",
        onboardingStatus: "approved",
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, id))
      .returning();

    if (!updatedVendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    logger.info("[API /admin/vendors/[id]/approve] Vendor approved", {
      vendorId: id,
      adminId: user.id,
    });

    return NextResponse.json({
      success: true,
      vendor: {
        id: updatedVendor.id,
        name: updatedVendor.name,
        status: updatedVendor.status,
      },
    });
  } catch (error) {
    logger.error("[API /admin/vendors/[id]/approve] Failed", error);
    return NextResponse.json(
      { error: "Failed to approve vendor" },
      { status: 500 }
    );
  }
}


