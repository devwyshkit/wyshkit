import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth, AuthError } from "@/lib/auth/server";
import { isAuthError, isErrorWithStatus, formatApiError } from "@/lib/types/api-errors";
import { z } from "zod";
import { isDevelopment } from "@/lib/config/env";

const customizeOrderSchema = z.object({
  customizations: z.array(
    z.object({
      productId: z.string(),
      text: z.string().optional(),
      photo: z.string().nullable().optional(),
      giftMessage: z.string().optional(),
    })
  ).min(1),
});

/**
 * POST /api/orders/[id]/customize
 * Submit customization details for order items (post-payment)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: orderId } = await params;

    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    // Fetch order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Verify order belongs to user
    if (order.customerId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Check if order is in correct status (awaiting_details or personalizing)
    if (!["awaiting_details", "personalizing"].includes(order.status)) {
      return NextResponse.json(
        { error: "Order is not in a state that allows customization" },
        { status: 400 }
      );
    }

    // Validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const validationResult = customizeOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { customizations } = validationResult.data;

    // Update order with customizations
    // Store customizations in order items or a separate field
    const orderItems = order.items as Array<{
      productId: string;
      quantity: number;
      price: number;
      variants?: Record<string, string>;
      addOns?: string[];
      customization?: { text?: string; photo?: string | null; giftMessage?: string };
    }>;
    
    const updatedItems = orderItems.map((item) => {
      const customization = customizations.find(
        (c) => c.productId === item.productId
      );
      if (customization) {
        return {
          ...item,
          customization: {
            text: customization.text || "",
            photo: customization.photo || null,
            giftMessage: customization.giftMessage || "",
          },
        };
      }
      return item;
    });

    // Update order status to "personalizing"
    await db
      .update(orders)
      .set({
        items: updatedItems,
        status: "personalizing",
      })
      .where(eq(orders.id, orderId));

    logger.info("[API /orders/[id]/customize] Customization submitted", {
      orderId,
      customerId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Customization details submitted successfully",
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      logger.warn("[API /orders/[id]/customize] Authentication required");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    logger.error("[API /orders/[id]/customize] Error", error);
    const errorResponse = formatApiError(error);
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}

