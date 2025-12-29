import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/client";

/**
 * Vendor Dashboard API
 * Swiggy Dec 2025 pattern: No dev fallbacks, direct database queries, strict auth.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "vendor") {
      return NextResponse.json(
        { error: "Unauthorized - vendor access required" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      logger.error("[Vendor Dashboard] Supabase client not available");
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    const { data: vendors, error: vendorError } = await supabase
      .from("vendors")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);
    
    if (vendorError) {
      logger.error("[Vendor Dashboard] Failed to fetch vendor", vendorError);
      return NextResponse.json({ error: "Failed to fetch vendor details" }, { status: 500 });
    }

    const vendor = vendors?.[0];

    if (!vendor) {
      return NextResponse.json({
        onboardingStatus: "new",
        todayOrders: 0,
        pendingMockups: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        ordersThisMonth: 0,
        averageRating: 0,
        pendingAcceptanceCount: 0,
        activeOrders: [],
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    // Fetch stats in parallel
    const [
      { count: todayOrders },
      { count: pendingMockups },
      { count: pendingAcceptanceCount },
      { data: activeOrders },
      { data: completedOrders },
      { data: pendingPayouts },
      { count: ordersThisMonth }
    ] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("vendor_id", vendor.id).gte("created_at", today.toISOString()),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("vendor_id", vendor.id).in("status", ["personalizing", "mockup_ready"]),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("vendor_id", vendor.id).eq("status", "pending"),
      supabase.from("orders").select("id, order_number, status, total").eq("vendor_id", vendor.id).not("status", "in", '("delivered","cancelled","pending")').order("created_at", { ascending: false }).limit(5),
      supabase.from("orders").select("vendor_amount").eq("vendor_id", vendor.id).eq("payment_status", "completed"),
      supabase.from("orders").select("vendor_amount").eq("vendor_id", vendor.id).eq("payment_status", "completed").is("delivered_at", null),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("vendor_id", vendor.id).gte("created_at", thisMonth.toISOString())
    ]);

    const totalEarnings = (completedOrders || []).reduce(
      (sum, o) => sum + parseFloat(o.vendor_amount || "0"),
      0
    );

    const pendingEarnings = (pendingPayouts || []).reduce(
      (sum, o) => sum + parseFloat(o.vendor_amount || "0"),
      0
    );

    logger.info("[Vendor Dashboard] Stats fetched successfully", { vendorId: vendor.id });

    return NextResponse.json({
      vendorId: vendor.id,
      todayOrders: todayOrders || 0,
      pendingMockups: pendingMockups || 0,
      totalEarnings: Math.round(totalEarnings),
      pendingEarnings: Math.round(pendingEarnings),
      ordersThisMonth: ordersThisMonth || 0,
      averageRating: parseFloat(vendor.rating || "0"),
      onboardingStatus: vendor.onboarding_status,
      pendingAcceptanceCount: pendingAcceptanceCount || 0,
      activeOrders: (activeOrders || []).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        total: o.total,
      })),
    });
  } catch (error) {
    logger.error("[Vendor Dashboard] Critical failure", error);
    return NextResponse.json(
      { error: "An internal error occurred" },
      { status: 500 }
    );
  }
}
