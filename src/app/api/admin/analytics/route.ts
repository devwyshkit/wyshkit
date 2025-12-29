import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { orders, vendors, users, products } from "@/lib/db/schema";
import { eq, and, sum, count, gte } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30";

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const periodDays = parseInt(period);
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const totalRevenueResult = await db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(eq(orders.paymentStatus, "completed"));
    const totalRevenue = parseFloat(totalRevenueResult[0].total || "0");

    const totalOrdersResult = await db
      .select({ count: count(orders.id) })
      .from(orders);
    const totalOrders = totalOrdersResult[0].count;

    const activeVendorsResult = await db
      .select({ count: count(vendors.id) })
      .from(vendors)
      .where(eq(vendors.status, "approved"));
    const activeVendors = activeVendorsResult[0].count;

    const activeCustomersResult = await db
      .select({ count: count(users.id) })
      .from(users)
      .where(eq(users.role, "customer"));
    const activeCustomers = activeCustomersResult[0].count;

    const totalProductsResult = await db
      .select({ count: count(products.id) })
      .from(products)
      .where(eq(products.isActive, true));
    const totalProducts = totalProductsResult[0].count;

    const periodRevenueResult = await db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(and(
        eq(orders.paymentStatus, "completed"),
        gte(orders.createdAt, periodStart)
      ));
    const periodRevenue = parseFloat(periodRevenueResult[0].total || "0");

    const periodOrdersResult = await db
      .select({ count: count(orders.id) })
      .from(orders)
      .where(gte(orders.createdAt, periodStart));
    const periodOrders = periodOrdersResult[0].count;

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      activeVendors,
      activeCustomers,
      totalProducts,
      periodRevenue,
      periodOrders,
      period: periodDays,
    });
  } catch (error) {
    logger.error("[API /admin/analytics] Error fetching analytics", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
