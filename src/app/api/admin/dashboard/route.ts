import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/client";

/**
 * Admin Dashboard API
 * Swiggy Dec 2025 pattern: Direct database queries, strict auth, no dev fallbacks.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - admin access required" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      logger.error("[Admin Dashboard] Supabase client not available");
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Swiggy Dec 2025 pattern: Fetch stats in parallel with optimized field selection
    // For count-only queries, select minimal field (id) instead of all fields
    const [
      { count: totalOrders },
      { count: todayOrders },
      { count: totalVendors },
      { count: pendingApprovals },
      { data: revenueData },
      { data: dailyOrdersData },
      { data: topVendorsData }
    ] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      supabase.from("vendors").select("id", { count: "exact", head: true }),
      supabase.from("vendors").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("total").eq("payment_status", "completed"),
      supabase.from("orders").select("created_at").gte("created_at", sevenDaysAgo.toISOString()),
      supabase.from("vendors").select("id, name").eq("status", "approved").limit(5)
    ]);

    const totalRevenue = (revenueData || []).reduce(
      (sum, order) => sum + parseFloat(order.total || "0"),
      0
    );

    const dailyOrders = groupByDate(dailyOrdersData || []);

    const topVendors = await Promise.all(
      (topVendorsData || []).map(async (vendor) => {
        const { data: vendorOrders } = await supabase
          .from("orders")
          .select("total")
          .eq("vendor_id", vendor.id)
          .eq("payment_status", "completed");
        
        const revenue = (vendorOrders || []).reduce(
          (sum, o) => sum + parseFloat(o.total || "0"),
          0
        );
        
        return {
          name: vendor.name,
          revenue: Math.round(revenue),
          orders: vendorOrders?.length || 0,
        };
      })
    );

    topVendors.sort((a, b) => b.revenue - a.revenue);

    // Swiggy Dec 2025 pattern: Calculate revenue growth from historical data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [currentPeriodData, previousPeriodData] = await Promise.all([
      supabase
        .from("orders")
        .select("total")
        .eq("payment_status", "completed")
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("orders")
        .select("total")
        .eq("payment_status", "completed")
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString()),
    ]);

    const currentPeriodRevenue = (currentPeriodData.data || []).reduce(
      (sum, order) => sum + parseFloat(order.total || "0"),
      0
    );
    const previousPeriodRevenue = (previousPeriodData.data || []).reduce(
      (sum, order) => sum + parseFloat(order.total || "0"),
      0
    );

    const revenueGrowth = previousPeriodRevenue > 0
      ? Math.round(((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 * 10) / 10
      : 0;

    // Swiggy Dec 2025 pattern: Calculate top categories from actual order items
    // Category tracking requires order items to include category field
    // For now, return empty array - will be implemented when order items schema includes category
    const topCategories: Array<{ name: string; revenue: number; percentage: number }> = [];

    logger.info("[Admin Dashboard] Stats fetched successfully");

    return NextResponse.json({
      totalOrders: totalOrders || 0,
      totalVendors: totalVendors || 0,
      totalRevenue: Math.round(totalRevenue),
      pendingApprovals: pendingApprovals || 0,
      todayOrders: todayOrders || 0,
      revenueGrowth,
      dailyOrders,
      topCategories,
      topVendors: topVendors.slice(0, 3),
      operationalMetrics: {
        // Swiggy Dec 2025 pattern: These metrics require tracking tables that don't exist yet
        // Return null/0 values until proper tracking is implemented
        mockupSlaCompliance: null,
        onTimeDelivery: null,
        customerSatisfaction: null,
        repeatOrderRate: null,
      },
    });
  } catch (error) {
    logger.error("[Admin Dashboard] Critical failure", error);
    return NextResponse.json(
      { error: "An internal error occurred" },
      { status: 500 }
    );
  }
}

function groupByDate(orders: { created_at: string }[]) {
  const grouped: Record<string, number> = {};
  orders.forEach((order) => {
    const date = order.created_at.split("T")[0];
    grouped[date] = (grouped[date] || 0) + 1;
  });
  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
