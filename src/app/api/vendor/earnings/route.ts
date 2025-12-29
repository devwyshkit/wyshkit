/**
 * Vendor Earnings API
 * Swiggy Dec 2025 pattern: Centralized vendor earnings tracking, no dev fallbacks.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { orders, vendors } from "@/lib/db/schema";
import { eq, and, sum, gte, sql } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days

    if (!db) {
      logger.error("[Vendor Earnings] Database connection not available");
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    // Get vendor ID from user ID
    const [vendor] = await db.select().from(vendors).where(eq(vendors.userId, user.id));

    if (!vendor) {
      return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
    }

    const vendorId = vendor.id;
    const periodDays = parseInt(period);
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Calculate total earnings (all completed orders)
    const totalEarningsResult = await db
      .select({ total: sum(orders.vendorAmount) })
      .from(orders)
      .where(and(
        eq(orders.vendorId, vendorId),
        eq(orders.paymentStatus, "completed")
      ));
    const totalEarnings = parseFloat(totalEarningsResult[0].total || "0");

    // Calculate period earnings
    const periodEarningsResult = await db
      .select({ total: sum(orders.vendorAmount) })
      .from(orders)
      .where(and(
        eq(orders.vendorId, vendorId),
        eq(orders.paymentStatus, "completed"),
        gte(orders.createdAt, periodStart)
      ));
    const periodEarnings = parseFloat(periodEarningsResult[0].total || "0");

    // Calculate pending earnings (orders with pending payment)
    const pendingEarningsResult = await db
      .select({ total: sum(orders.vendorAmount) })
      .from(orders)
      .where(and(
        eq(orders.vendorId, vendorId),
        eq(orders.paymentStatus, "pending")
      ));
    const pendingEarnings = parseFloat(pendingEarningsResult[0].total || "0");

    // Count completed orders in period
    const completedOrdersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(
        eq(orders.vendorId, vendorId),
        eq(orders.paymentStatus, "completed"),
        gte(orders.createdAt, periodStart)
      ));
    const completedOrders = Number(completedOrdersResult[0].count || 0);

    return NextResponse.json({
      totalEarnings,
      periodEarnings,
      pendingEarnings,
      completedOrders,
      period: periodDays,
    });
  } catch (error) {
    logger.error("[Vendor Earnings] Critical failure", error);
    return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
  }
}
