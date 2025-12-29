import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { orders, notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";

const mockupSchema = z.object({
  mockupImages: z.record(z.array(z.string())), // { productId: [urls] }
});

/**
 * POST /api/vendor/orders/[id]/mockup - Upload order mockups
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

    const body = await request.json();
    const { mockupImages } = mockupSchema.parse(body);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order status and mockups
    await db
      .update(orders)
      .set({
        status: "mockup_ready",
        mockupImages: mockupImages,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    // Create notification for customer
    await db.insert(notifications).values({
      userId: order.customerId,
      type: "order",
      title: "Mockups Ready",
      message: `Vendor has uploaded mockups for your order #${order.orderNumber}. Please review them.`,
      data: { orderId: order.id },
    });

    logger.info(`[Vendor Orders] Mockups uploaded for order: ${order.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Vendor Orders] Mockup upload failed", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
