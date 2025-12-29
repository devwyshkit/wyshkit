import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";

/**
 * POST /api/vendor/orders/[id]/ready - Mark order as ready for pickup
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

    // Only approved orders can be marked as ready
    if (order.status !== "approved" && order.status !== "crafting") {
      return NextResponse.json({ error: "Order must be approved before marking as ready" }, { status: 400 });
    }

    // Update order status
    await db
      .update(orders)
      .set({
        status: "ready_for_pickup",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    // Create notification for customer
    await db.insert(notifications).values({
      userId: order.customerId,
      type: "order",
      title: "Order Ready!",
      message: `Your order #${order.orderNumber} is ready for pickup and will be out for delivery shortly.`,
      data: { orderId: order.id },
    });

    // In a real app, this would also trigger a delivery partner request (e.g., Nimbus API)

    logger.info(`[Vendor Orders] Order marked as ready for pickup: ${order.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Vendor Orders] Ready status failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
