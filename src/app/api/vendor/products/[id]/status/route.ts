/**
 * Vendor Product Status API
 * Swiggy Dec 2025 pattern: Toggle product availability (OOS)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, vendors } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const { isActive } = await request.json();
    const productId = params.id;

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

    // Update product status
    const result = await db
      .update(products)
      .set({ isActive: !!isActive })
      .where(
        and(
          eq(products.id, productId),
          eq(products.vendorId, vendor.id)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Product not found or unauthorized" },
        { status: 404 }
      );
    }

    logger.info("[API /vendor/products/status] Product updated", {
      productId,
      isActive,
    });

    return NextResponse.json({ success: true, isActive: result[0].isActive });
  } catch (error) {
    logger.error("[API /vendor/products/status] Failed", error);
    return NextResponse.json(
      { error: "Failed to update product status" },
      { status: 500 }
    );
  }
}
