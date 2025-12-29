/**
 * Reject Vendor API
 * Swiggy Dec 2025 pattern: Simple rejection workflow
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { isDevelopment } from "@/lib/config/env";

/**
 * PATCH /api/admin/vendors/[id]/reject - Reject a vendor
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
        logger.warn("[API /admin/vendors/[id]/reject] Development mode: Mock rejection");
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
        status: "rejected",
        onboardingStatus: "rejected",
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

    logger.info("[API /admin/vendors/[id]/reject] Vendor rejected", {
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
    logger.error("[API /admin/vendors/[id]/reject] Failed", error);
    return NextResponse.json(
      { error: "Failed to reject vendor" },
      { status: 500 }
    );
  }
}


