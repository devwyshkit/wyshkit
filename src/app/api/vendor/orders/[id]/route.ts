import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/vendor/orders/[id] - Get single order details for vendor
 */
export async function GET(
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

    // Get vendor ID from user ID using Supabase client
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (vendorError || !vendorData) {
      if (vendorError?.code === 'PGRST116') {
        return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
      }
      logger.error("[API /vendor/orders/[id]] Failed to fetch vendor", vendorError);
      return NextResponse.json({ error: "Failed to fetch vendor profile" }, { status: 500 });
    }

    // Get order using Supabase client (RLS compatible - vendors can see their own orders)
    // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, vendor_id, status, sub_status, items, item_total, delivery_fee, platform_fee, cashback_used, total, delivery_type, delivery_address, payment_id, payment_status, mockup_images, mockup_approved_at, accept_deadline, mockup_sla, revision_request, delivery_partner_id, delivery_partner_phone, estimated_delivery, delivered_at, created_at, updated_at')
      .eq('id', id)
      .eq('vendor_id', vendorData.id)
      .single();

    if (orderError || !order) {
      if (orderError?.code === 'PGRST116') {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      logger.error("[API /vendor/orders/[id]] Failed to fetch order", orderError);
      return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }

    // Fetch product names for the items using Supabase client
    const productIds = (order.items as Array<{ productId: string }>).map(item => item.productId);
    if (productIds.length > 0) {
      const { data: orderProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);

      if (productsError) {
        logger.error("[API /vendor/orders/[id]] Failed to fetch products", productsError);
        // Continue without product names
      }

      const productsMap = (orderProducts || []).reduce((acc, p) => {
        acc[p.id] = p.name;
        return acc;
      }, {} as Record<string, string>);

      // Map Supabase response (snake_case) to camelCase for response
      const formattedOrder = {
        id: order.id,
        orderNumber: order.order_number,
        customerId: order.customer_id,
        vendorId: order.vendor_id,
        status: order.status,
        subStatus: order.sub_status,
        items: (order.items as Array<{ productId: string }>).map(item => ({
          ...item,
          productName: productsMap[item.productId] || "Unknown Product"
        })),
        itemTotal: parseFloat(order.item_total || "0"),
        deliveryFee: parseFloat(order.delivery_fee || "0"),
        platformFee: parseFloat(order.platform_fee || "0"),
        cashbackUsed: parseFloat(order.cashback_used || "0"),
        total: parseFloat(order.total || "0"),
        deliveryType: order.delivery_type,
        deliveryAddress: order.delivery_address,
        gstin: order.gstin,
        paymentId: order.payment_id,
        paymentStatus: order.payment_status,
        razorpayRouteId: order.razorpay_route_id,
        commissionAmount: order.commission_amount ? parseFloat(order.commission_amount) : null,
        vendorAmount: order.vendor_amount ? parseFloat(order.vendor_amount) : null,
        mockupImages: order.mockup_images,
        mockupApprovedAt: order.mockup_approved_at,
        acceptDeadline: order.accept_deadline,
        mockupSla: order.mockup_sla,
        revisionRequested: order.revision_requested,
        revisionNotes: order.revision_notes,
        deliveredAt: order.delivered_at,
        createdAt: order.created_at ? new Date(order.created_at).toISOString() : null,
        updatedAt: order.updated_at ? new Date(order.updated_at).toISOString() : null,
      };

      return NextResponse.json(formattedOrder);
    }

    // If no product IDs, return order without product names
    const formattedOrder = {
      id: order.id,
      orderNumber: order.order_number,
      customerId: order.customer_id,
      vendorId: order.vendor_id,
      status: order.status,
      subStatus: order.sub_status,
      items: order.items,
      itemTotal: parseFloat(order.item_total || "0"),
      deliveryFee: parseFloat(order.delivery_fee || "0"),
      platformFee: parseFloat(order.platform_fee || "0"),
      cashbackUsed: parseFloat(order.cashback_used || "0"),
      total: parseFloat(order.total || "0"),
      deliveryType: order.delivery_type,
      deliveryAddress: order.delivery_address,
      gstin: order.gstin,
      paymentId: order.payment_id,
      paymentStatus: order.payment_status,
      razorpayRouteId: order.razorpay_route_id,
      commissionAmount: order.commission_amount ? parseFloat(order.commission_amount) : null,
      vendorAmount: order.vendor_amount ? parseFloat(order.vendor_amount) : null,
      mockupImages: order.mockup_images,
      mockupApprovedAt: order.mockup_approved_at,
      acceptDeadline: order.accept_deadline,
      mockupSla: order.mockup_sla,
      revisionRequested: order.revision_requested,
      revisionNotes: order.revision_notes,
      deliveredAt: order.delivered_at,
      createdAt: order.created_at ? new Date(order.created_at).toISOString() : null,
      updatedAt: order.updated_at ? new Date(order.updated_at).toISOString() : null,
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    logger.error("[API /vendor/orders/[id]] Error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
