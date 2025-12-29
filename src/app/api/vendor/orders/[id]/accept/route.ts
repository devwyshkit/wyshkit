import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";

/**
 * POST /api/vendor/orders/[id]/accept - Accept an order
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (user.role !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "pending") {
      return NextResponse.json({ error: "Order already processed" }, { status: 400 });
    }

    // Check if accept deadline passed (optional, for now just allow)
    
    // Update order status
    await db
      .update(orders)
      .set({
        status: "personalizing",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    // Create notification for customer
    await db.insert(notifications).values({
      userId: order.customerId,
      type: "order",
      title: "Order Accepted",
      message: `Vendor has accepted your order #${order.orderNumber} and is preparing it.`,
      data: { orderId: order.id },
    });

    logger.info(`[Vendor Orders] Accepted order: ${order.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Vendor Orders] Accept failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
