import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/server";
import { logger } from "@/lib/utils/logger";
import { isAuthError, isErrorWithStatus } from "@/lib/types/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!db) {
      logger.error("[API /orders/[id]] Database not available");
      return NextResponse.json(
        { error: "Service temporarily unavailable.", code: "DATABASE_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.customerId !== user.id && order.vendorId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized access to this order" }, { status: 403 });
    }

    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      vendorId: order.vendorId,
      status: order.status,
      subStatus: order.subStatus || undefined,
      items: Array.isArray(order.items) ? order.items : [],
      itemTotal: parseFloat(order.itemTotal || "0"),
      deliveryFee: parseFloat(order.deliveryFee || "0"),
      platformFee: parseFloat(order.platformFee || "0"),
      cashbackUsed: parseFloat(order.cashbackUsed || "0"),
      total: parseFloat(order.total || "0"),
      deliveryType: order.deliveryType,
      deliveryAddress: order.deliveryAddress,
      paymentId: order.paymentId,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: order.updatedAt?.toISOString() || new Date().toISOString(),
    };

    logger.info("[API /orders/[id]] Returning order", id);
    return NextResponse.json(formattedOrder);
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      logger.warn("[API /orders/[id]] Authentication required");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    logger.error("[API /orders/[id]] Error", error);
    return NextResponse.json(
      { error: "Unable to load order information.", code: "ORDER_FETCH_FAILED" },
      { status: 500 }
    );
  }
}
