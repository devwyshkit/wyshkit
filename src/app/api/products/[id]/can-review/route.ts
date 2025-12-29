import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthError } from "@/lib/auth/server";
import { logger } from "@/lib/utils/logger";
import { isDevelopment } from "@/lib/config/env";

/**
 * Check if user can review a product
 * Returns true if user has a delivered order containing this product
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: productId } = await params;

    // Check database availability
    if (!db) {
      if (isDevelopment) {
        logger.warn("[GET /api/products/[id]/can-review] Development mode: Using mock response (database not available)");
        // In development, allow reviews for testing
        return NextResponse.json({
          canReview: true,
          _devMode: true,
        });
      }
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    // Check if user has a delivered order for this product
    const deliveredOrders = await db
      .select({
        id: orders.id,
        items: orders.items,
      })
      .from(orders)
      .where(
        and(
          eq(orders.customerId, user.id),
          eq(orders.status, "delivered")
        )
      );

    // Check if any order contains this product
    const canReview = deliveredOrders.some(order => {
      const items = order.items as Array<{ productId: string }> | null;
      return items?.some(item => item.productId === productId);
    });

    return NextResponse.json({ canReview });
  } catch (error) {
    logger.error("[GET /api/products/[id]/can-review] Failed", error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to check review eligibility" },
      { status: 500 }
    );
  }
}



