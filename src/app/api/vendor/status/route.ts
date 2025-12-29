/**
 * Vendor Status API
 * Swiggy Dec 2025 pattern: Toggle online/offline status
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const { isOnline } = await request.json();

    if (user.role !== "vendor") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get vendor
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.userId, user.id))
      .limit(1);

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Update status
    await db
      .update(vendors)
      .set({ isOnline: !!isOnline })
      .where(eq(vendors.id, vendor.id));

    logger.info("[API /vendor/status] Status updated", {
      vendorId: vendor.id,
      isOnline,
    });

    return NextResponse.json({ success: true, isOnline });
  } catch (error) {
    logger.error("[API /vendor/status] Failed", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "vendor") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const [vendor] = await db
      .select({ isOnline: vendors.isOnline })
      .from(vendors)
      .where(eq(vendors.userId, user.id))
      .limit(1);

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ isOnline: vendor.isOnline });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
