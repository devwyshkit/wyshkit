/**
 * Verify Razorpay Payment
 * Swiggy Dec 2025 pattern: Server-side payment verification
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getRazorpayService } from "@/lib/services/razorpay";
import { emailService } from "@/lib/services/email";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import crypto from "crypto";
import { timingSafeEqual, stringToBytes } from "@/lib/utils/crypto-safe";
import { env } from "@/lib/config/env";

const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
  orderId: z.string().uuid(),
});

/**
 * Verify Razorpay payment signature
 */
function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = env.RAZORPAY_KEY_SECRET || env.RAZORPAY_SECRET;
  
  if (!keySecret) {
    logger.error("[Payment Verify] Razorpay secret not configured");
    return false;
  }

  try {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    return timingSafeEqual(
      stringToBytes(signature, "hex"),
      stringToBytes(expectedSignature, "hex")
    );
  } catch (error) {
    logger.error("[Payment Verify] Signature verification error", error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } =
      verifyPaymentSchema.parse(body);

    // Verify payment signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      logger.error("[Payment Verify] Invalid payment signature", {
        orderId,
        razorpay_order_id,
        razorpay_payment_id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment signature",
          code: "INVALID_SIGNATURE",
        },
        { status: 400 }
      );
    }

    // Verify payment with Razorpay API
    const razorpayService = getRazorpayService();
    let paymentStatus: string;
    
    try {
      const payment = await razorpayService.verifyPayment(razorpay_payment_id);
      paymentStatus = payment.status;
    } catch (error) {
      logger.error("[Payment Verify] Failed to verify payment with Razorpay", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to verify payment with Razorpay",
          code: "RAZORPAY_VERIFY_FAILED",
        },
        { status: 500 }
      );
    }

    // Update order in database
    if (db) {
      try {
        const [updatedOrder] = await db
          .update(orders)
          .set({
            paymentStatus: paymentStatus === "captured" ? "completed" : "pending",
            paymentId: razorpay_payment_id,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId))
          .returning();

        if (!updatedOrder) {
          logger.error("[Payment Verify] Order not found", { orderId });
          return NextResponse.json(
            {
              success: false,
              error: "Order not found",
              code: "ORDER_NOT_FOUND",
            },
            { status: 404 }
          );
        }

        logger.info("[Payment Verify] Payment verified successfully", {
          orderId,
          orderNumber: updatedOrder.orderNumber,
          paymentId: razorpay_payment_id,
          status: paymentStatus,
        });

        // Send payment confirmation email (non-blocking)
        if (updatedOrder.paymentStatus === "completed") {
          try {
            // Get customer email
            const [customer] = await db
              .select({ email: users.email })
              .from(users)
              .where(eq(users.id, updatedOrder.customerId))
              .limit(1);

            if (customer?.email) {
              await emailService.sendOrderStatusUpdate(
                customer.email,
                updatedOrder.orderNumber,
                "payment_completed",
                "Your payment has been confirmed. We'll start processing your order soon."
              );
              logger.info("[Payment Verify] Payment confirmation email sent", { orderId, email: customer.email });
            }
          } catch (emailError) {
            // Don't fail payment verification if email fails
            logger.error("[Payment Verify] Failed to send payment confirmation email", emailError);
          }
        }

        return NextResponse.json({
          success: true,
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          paymentStatus: updatedOrder.paymentStatus,
          message: "Payment verified successfully",
        });
      } catch (dbError) {
        logger.error("[Payment Verify] Database update failed", dbError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to update order",
            code: "DATABASE_ERROR",
          },
          { status: 500 }
        );
      }
    } else {
      logger.warn("[Payment Verify] Database not available");
      return NextResponse.json(
        {
          success: false,
          error: "Database not available",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }
  } catch (error) {
    logger.error("[Payment Verify] Failed", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Payment verification failed",
        code: "VERIFY_FAILED",
      },
      { status: 500 }
    );
  }
}

