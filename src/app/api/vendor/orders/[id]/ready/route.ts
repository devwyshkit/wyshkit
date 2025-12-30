import { NextResponse } from "next/server";
import { createSupabaseServerClientWithRequest, getSupabaseServiceClient } from "@/lib/supabase/client";
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

    // Only approved orders can be marked as ready
    if (order.status !== "approved" && order.status !== "crafting") {
      return NextResponse.json({ error: "Order must be approved before marking as ready" }, { status: 400 });
    }

    // Update order status - RLS policy allows vendors to update their own orders
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'ready_for_pickup',
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
          title: 'Order Ready!',
          body: `Your order #${order.order_number} is ready for pickup and will be out for delivery shortly.`,
          data: { orderId: order.id },
        });

      if (notificationError) {
        logger.error("[Vendor Orders] Failed to create notification", notificationError);
        // Don't fail the request if notification fails
      }
    }

    // NOTE: Delivery partner integration (e.g., Nimbus API) is prepared but not currently integrated
    // See src/lib/services/nimbus.ts for delivery service implementation

    logger.info(`[Vendor Orders] Order marked as ready for pickup: ${order.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Vendor Orders] Ready status failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
