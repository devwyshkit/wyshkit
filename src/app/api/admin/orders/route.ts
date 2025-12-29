import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { orders, disputes, vendors } from "@/lib/db/schema";
import { eq, desc, and, like, count, sql } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const conditions = [];
    if (status && status !== "all") {
      const validStatuses = [
        "pending", "personalizing", "mockup_ready", "crafting", 
        "awaiting_details", "approved", "ready_for_pickup", 
        "out_for_delivery", "delivered", "cancelled"
      ];
      if (validStatuses.includes(status)) {
        conditions.push(eq(orders.status, status as typeof orders.status.enumValues[number]));
      }
    }
    if (search) {
      conditions.push(like(orders.orderNumber, `%${search}%`));
    }

    const totalResult = await db
      .select({ count: count() })
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = totalResult[0]?.count || 0;

    const dbOrders = await db
      .select({
        order: orders,
        vendorName: vendors.name,
        disputeCount: sql<number>`(SELECT count(*) FROM ${disputes} WHERE ${disputes.orderId} = ${orders.id})::int`
      })
      .from(orders)
      .leftJoin(vendors, eq(orders.vendorId, vendors.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const now = new Date();

    const formattedOrders = dbOrders.map(({ order, vendorName, disputeCount }) => {
      const isSlaBreached = order.status === "personalizing" && 
                          order.mockupSla && 
                          new Date(order.mockupSla) < now;

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        vendorId: order.vendorId,
        vendorName,
        status: order.status,
        subStatus: order.subStatus,
        total: parseFloat(order.total || "0"),
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: order.updatedAt?.toISOString() || new Date().toISOString(),
        mockupSla: order.mockupSla?.toISOString(),
        isSlaBreached,
        hasDispute: disputeCount > 0
      };
    });

    return NextResponse.json({
      orders: formattedOrders,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error("[API /admin/orders] Error fetching orders", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
