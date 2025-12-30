import { NextResponse } from "next/server";
import { createSupabaseServerClientWithRequest, getSupabaseServiceClient } from "@/lib/supabase/client";
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

    // Use authenticated Supabase client (has auth context for RLS)
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    // Get order using Supabase client (RLS compatible)
    // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, vendor_id, status, sub_status, items, item_total, delivery_fee, platform_fee, cashback_used, total, delivery_type, delivery_address, payment_id, payment_status, created_at, updated_at')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      if (orderError?.code === 'PGRST116') {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      logger.error("[Vendor Orders] Failed to fetch order", orderError);
      return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }

    if (order.status !== "pending") {
      return NextResponse.json({ error: "Order already processed" }, { status: 400 });
    }

    // Update order status - RLS policy allows vendors to update their own orders
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'personalizing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      logger.error("[Vendor Orders] Failed to update order", updateError);
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }

    // Create notification for customer - use service role for system operations
    const supabaseService = getSupabaseServiceClient();
    if (supabaseService) {
      const { error: notificationError } = await supabaseService
        .from('notifications')
        .insert({
          user_id: order.customer_id,
          type: 'order',
          title: 'Order Accepted',
          body: `Vendor has accepted your order #${order.order_number} and is preparing it.`,
          data: { orderId: order.id },
        });

      if (notificationError) {
        logger.error("[Vendor Orders] Failed to create notification", notificationError);
        // Don't fail the request if notification fails
      }
    }

    logger.info(`[Vendor Orders] Accepted order: ${order.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Vendor Orders] Accept failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
