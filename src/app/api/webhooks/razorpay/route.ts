/**
 * Razorpay Webhook Handler
 * Swiggy Dec 2025 pattern: Secure webhook verification and real-time updates
 */

import { NextResponse } from "next/server";
import { getRazorpayService } from "@/lib/services/razorpay";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { getSupabaseServiceClient } from "@/lib/supabase/client";

/**
 * Handle Razorpay webhook events
 * Events: payment.captured, payment.failed, order.paid
 */
export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      logger.error("[Razorpay Webhook] Missing signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const razorpayService = getRazorpayService();
    const isValid = razorpayService.verifyWebhook(signature, rawBody);

    if (!isValid) {
      logger.error("[Razorpay Webhook] Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    logger.info("[Razorpay Webhook] Event received", { event, paymentId: paymentEntity?.id });

    // Handle different event types
    if (event === "payment.captured" && paymentEntity) {
      await handlePaymentCaptured(paymentEntity);
    } else if (event === "payment.failed" && paymentEntity) {
      await handlePaymentFailed(paymentEntity);
    } else if (event === "order.paid" && orderEntity) {
      await handleOrderPaid(orderEntity);
    } else {
      logger.info("[Razorpay Webhook] Unhandled event", { event });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("[Razorpay Webhook] Failed", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle payment.captured event
 */
async function handlePaymentCaptured(paymentEntity: {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  notes?: Record<string, string>;
}) {
  try {
    const orderId = paymentEntity.notes?.order_id;
    
    if (!orderId || !db) {
      logger.warn("[Razorpay Webhook] Missing order_id in payment notes", paymentEntity);
      return;
    }

    // Update order payment status
    const [updatedOrder] = await db
      .update(orders)
      .set({
        paymentStatus: "completed",
        paymentId: paymentEntity.id,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (updatedOrder) {
      logger.info("[Razorpay Webhook] Payment captured", {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        paymentId: paymentEntity.id,
      });

      // Update Supabase in real-time (if using Supabase for orders)
      const supabase = getSupabaseServiceClient();
      if (supabase) {
        try {
          await supabase
            .from("orders")
            .update({
              payment_status: "completed",
              payment_id: paymentEntity.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
        } catch (supabaseError) {
          // Log but don't fail - Supabase update is optional
          logger.warn("[Razorpay Webhook] Supabase update failed", supabaseError);
        }
      }
    }
  } catch (error) {
    logger.error("[Razorpay Webhook] Failed to handle payment.captured", error);
  }
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(paymentEntity: {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  notes?: Record<string, string>;
}) {
  try {
    const orderId = paymentEntity.notes?.order_id;
    
    if (!orderId || !db) {
      logger.warn("[Razorpay Webhook] Missing order_id in payment notes", paymentEntity);
      return;
    }

    // Update order payment status
    if (db) {
      const [updatedOrder] = await db
        .update(orders)
        .set({
          paymentStatus: "failed",
          paymentId: paymentEntity.id,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (updatedOrder) {
        logger.info("[Razorpay Webhook] Payment failed", {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          paymentId: paymentEntity.id,
        });
      }
    }
  } catch (error) {
    logger.error("[Razorpay Webhook] Failed to handle payment.failed", error);
  }
}

/**
 * Handle order.paid event
 */
async function handleOrderPaid(orderEntity: {
  id: string;
  amount: number;
  status: string;
}) {
  try {
    // This event is less common, but handle it if needed
    logger.info("[Razorpay Webhook] Order paid", {
      razorpayOrderId: orderEntity.id,
      status: orderEntity.status,
    });
  } catch (error) {
    logger.error("[Razorpay Webhook] Failed to handle order.paid", error);
  }
}


