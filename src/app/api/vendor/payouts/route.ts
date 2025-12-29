import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, vendors } from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.userId, user.id))
      .limit(1);

    if (!vendor) {
      return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Get completed orders as transactions
    const transactions = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        vendorAmount: orders.vendorAmount,
        total: orders.total,
        paymentStatus: orders.paymentStatus,
        status: orders.status,
        deliveredAt: orders.deliveredAt,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.vendorId, vendor.id),
          eq(orders.paymentStatus, "completed")
        )
      )
      .orderBy(desc(orders.deliveredAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.vendorId, vendor.id),
          eq(orders.paymentStatus, "completed")
        )
      );

    // Get summary stats
    const [summary] = await db
      .select({
        totalSettled: sql<number>`coalesce(sum(case when ${orders.deliveredAt} is not null then ${orders.vendorAmount}::numeric else 0 end), 0)::float`,
        totalPending: sql<number>`coalesce(sum(case when ${orders.deliveredAt} is null then ${orders.vendorAmount}::numeric else 0 end), 0)::float`,
        transactionCount: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.vendorId, vendor.id),
          eq(orders.paymentStatus, "completed")
        )
      );

    return NextResponse.json({
      transactions: transactions.map(t => ({
        id: t.id,
        orderNumber: t.orderNumber,
        amount: parseFloat(t.vendorAmount || "0"),
        orderTotal: parseFloat(t.total || "0"),
        status: t.deliveredAt ? "settled" : "pending",
        settledAt: t.deliveredAt?.toISOString(),
        createdAt: t.createdAt?.toISOString(),
      })),
      summary: {
        totalSettled: Math.round(summary?.totalSettled || 0),
        totalPending: Math.round(summary?.totalPending || 0),
        transactionCount: summary?.transactionCount || 0,
      },
      pagination: {
        page,
        limit,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / limit),
      },
    });
  } catch (error) {
    logger.error("[API /vendor/payouts] Failed", error);
    return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
  }
}
