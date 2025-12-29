import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth, AuthError } from "@/lib/auth/server";
import { isAuthError, isErrorWithStatus, getErrorMessage, formatApiError } from "@/lib/types/api-errors";
import { emailService } from "@/lib/services/email";
import { z } from "zod";
import { isDevelopment } from "@/lib/config/env";

const uploadMockupSchema = z.object({
  productId: z.string(),
  mockupImage: z.string().url(),
  artisanNote: z.string().optional(),
});

const approveMockupSchema = z.object({
  productId: z.string().optional(), // Optional for backward compatibility
  approved: z.boolean(),
  revisionRequest: z.string().optional(),
});

/**
 * POST /api/orders/[id]/mockup
 * Upload mockup for an order item (vendor) or approve/reject mockup (customer)
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

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const action = body.action; // "upload" or "approve"

    if (action === "upload") {
      // Vendor uploading mockup
      // Verify user is the vendor
      if (order.vendorId !== user.id) {
        return NextResponse.json(
          { error: "Unauthorized - only vendor can upload mockups" },
          { status: 403 }
        );
      }

      // Validate request
      const validationResult = uploadMockupSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: validationResult.error.errors,
          },
          { status: 400 }
        );
      }

      const { productId, mockupImage, artisanNote } = validationResult.data;

      // Update mockupImages in orders table
      const currentMockupImages = (order.mockupImages as Record<string, string[]> | null) || {};
      const productMockups = currentMockupImages[productId] || [];
      productMockups.push(mockupImage);
      
      const updatedMockupImages = {
        ...currentMockupImages,
        [productId]: productMockups,
      };

      // Update order with new mockup image
      await db
        .update(orders)
        .set({ 
          mockupImages: updatedMockupImages,
          status: "mockup_ready",
        })
        .where(eq(orders.id, orderId));

      // Check if all items have mockups
      const orderItems = order.items as Array<{ productId: string }>;
      const allItemsHaveMockups = orderItems.every(
        (item) => updatedMockupImages[item.productId]?.length > 0
      );

      if (allItemsHaveMockups) {
        await db
          .update(orders)
          .set({ status: "mockup_ready" })
          .where(eq(orders.id, orderId));

        // Send email notification to customer that mockup is ready (non-blocking)
        try {
          const [customer] = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, order.customerId))
            .limit(1);

          if (customer?.email) {
            await emailService.sendOrderStatusUpdate(
              customer.email,
              order.orderNumber,
              "mockup_ready",
              "Your order mockup is ready for review. Please check and approve it to proceed."
            );
            logger.info("[API /orders/[id]/mockup] Mockup ready email sent", { orderId, email: customer.email });
          }
        } catch (emailError) {
          logger.error("[API /orders/[id]/mockup] Failed to send mockup ready email", emailError);
        }
      }

      logger.info("[API /orders/[id]/mockup] Mockup uploaded", {
        orderId,
        productId,
        vendorId: user.id,
      });

      return NextResponse.json({
        success: true,
        message: "Mockup uploaded successfully",
      });
    } else if (action === "approve") {
      // Customer approving/rejecting mockup
      // Verify user is the customer
      if (order.customerId !== user.id) {
        return NextResponse.json(
          { error: "Unauthorized - only customer can approve mockups" },
          { status: 403 }
        );
      }

      // Validate request
      const validationResult = approveMockupSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: validationResult.error.errors,
          },
          { status: 400 }
        );
      }

      const { productId, approved, revisionRequest } = validationResult.data;

      // Update order based on approval status
      type OrderUpdate = {
        mockupApprovedAt?: Date;
        status?: string;
        revisionRequest?: {
          productId: string | null;
          feedback: string;
          requestedAt: string;
        } | null;
      };
      
      const updateData: OrderUpdate = {};
      
      if (approved) {
        updateData.mockupApprovedAt = new Date();
        updateData.status = "crafting";
        // Clear any previous revision request
        updateData.revisionRequest = null;
      } else {
        // Revision requested
        updateData.revisionRequest = {
          productId: productId || null,
          feedback: revisionRequest || "Please revise the mockup",
          requestedAt: new Date().toISOString(),
        };
        updateData.status = "personalizing"; // Back to personalizing for revision
      }

      const [updatedOrder] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId))
        .returning();

      // Send email notification based on action (non-blocking)
      if (updatedOrder) {
        try {
          if (approved) {
            // Notify vendor that mockup was approved and crafting started
            const [vendor] = await db
              .select({ email: users.email })
              .from(users)
              .where(eq(users.id, order.vendorId))
              .limit(1);

            if (vendor?.email) {
              await emailService.sendOrderStatusUpdate(
                vendor.email,
                order.orderNumber,
                "crafting",
                "Customer has approved the mockup. You can now start crafting the order."
              );
              logger.info("[API /orders/[id]/mockup] Mockup approved email sent to vendor", { orderId, email: vendor.email });
            }
          } else {
            // Notify vendor that revision was requested
            const [vendor] = await db
              .select({ email: users.email })
              .from(users)
              .where(eq(users.id, order.vendorId))
              .limit(1);

            if (vendor?.email) {
              await emailService.sendEmail({
                to: vendor.email,
                subject: `Revision Requested for Order ${order.orderNumber}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Revision Requested</h2>
                    <p>The customer has requested a revision for order <strong>${order.orderNumber}</strong>.</p>
                    ${revisionRequest ? `<p><strong>Feedback:</strong> ${revisionRequest}</p>` : ""}
                    <p>Please review the feedback and upload a revised mockup.</p>
                  </div>
                `,
                text: `Revision requested for order ${order.orderNumber}.${revisionRequest ? ` Feedback: ${revisionRequest}` : ""}`,
              });
              logger.info("[API /orders/[id]/mockup] Revision request email sent to vendor", { orderId, email: vendor.email });
            }
          }
        } catch (emailError) {
          logger.error("[API /orders/[id]/mockup] Failed to send email notification", emailError);
        }
      }

      logger.info("[API /orders/[id]/mockup] Mockup action", {
        orderId,
        productId,
        action: approved ? "approved" : "revision_requested",
        customerId: user.id,
      });

      return NextResponse.json({
        success: true,
        message: approved
          ? "Mockup approved successfully"
          : "Revision requested",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'upload' or 'approve'" },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      logger.warn("[API /orders/[id]/mockup] Authentication required");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    logger.error("[API /orders/[id]/mockup] Error", error);
    const errorResponse = formatApiError(error);
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/[id]/mockup
 * Fetch all mockups for an order
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: orderId } = await params;

    if (!db) {
      if (isDevelopment) {
        logger.warn("[API /orders/[id]/mockup] Development mode: Using mock mockups (database not available)");
        return NextResponse.json({
          mockups: [],
          _devMode: true,
        });
      }
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    // Fetch order to verify access
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

    // Verify user has access (customer or vendor)
    if (order.customerId !== user.id && order.vendorId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Return mockup images from order
    const mockupImages = order.mockupImages as Record<string, string[]> | null;
    
    // Transform to array format for easier frontend consumption
    const mockups = mockupImages 
      ? Object.entries(mockupImages).map(([productId, images]) => ({
          productId,
          images,
        }))
      : [];

    return NextResponse.json({
      mockups,
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    logger.error("[API /orders/[id]/mockup] GET Error", error);
    const errorResponse = formatApiError(error);
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}

