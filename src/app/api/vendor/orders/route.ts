import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { logger } from "@/lib/utils/logger";
import { getSupabaseServiceClient } from "@/lib/supabase/client";

/**
 * Vendor Orders API
 * Swiggy Dec 2025 pattern: Direct database queries, strict auth, no dev fallbacks.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      logger.error("[Vendor Orders] Supabase client not available");
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    const { data: vendors, error: vendorError } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    
    if (vendorError || !vendors?.[0]) {
      return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
    }

    const vendorId = vendors[0].id;

    let query = supabase
      .from("orders")
      .select("*")
      .eq("vendor_id", vendorId);

    if (filter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte("created_at", today.toISOString());
    } else if (filter !== "all") {
      query = query.eq("status", filter);
    }

    query = query.order("created_at", { ascending: false });

    const { data: dbOrders, error: ordersError } = await query;

    if (ordersError) {
      logger.error("[Vendor Orders] Failed to fetch orders", ordersError);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    const formattedOrders = (dbOrders || []).map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      subStatus: order.sub_status,
      total: parseFloat(order.total || "0"),
      itemTotal: parseFloat(order.item_total || "0"),
      deliveryFee: parseFloat(order.delivery_fee || "0"),
      items: Array.isArray(order.items) ? order.items : [],
      deliveryAddress: order.delivery_address,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    }));

    return NextResponse.json(formattedOrders);
  } catch (error) {
    logger.error("[Vendor Orders] Critical failure", error);
    return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
  }
}
