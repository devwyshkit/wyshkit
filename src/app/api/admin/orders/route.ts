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

    let total = 0;
    let dbOrders = [];

    try {
      const totalResult = await db
        .select({ count: count() })
        .from(orders)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      total = totalResult[0]?.count || 0;

      dbOrders = await db
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
    } catch (dbError) {
      logger.error("[API /admin/orders] Database operation failed", {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
        operation: "select",
        table: "orders",
        status,
        search,
      });
      
      return NextResponse.json(
        { 
          error: "Failed to fetch orders. Please try again.", 
          code: "DATABASE_ERROR",
          ...(process.env.NODE_ENV === "development" && { 
            details: dbError instanceof Error ? dbError.message : String(dbError) 
          }),
        },
        { status: 500 }
      );
    }

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
    // Check if it's an auth error
    if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
      return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    
    logger.error("[API /admin/orders] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        error: "Failed to fetch orders. Please try again.", 
        code: "INTERNAL_ERROR",
        ...(process.env.NODE_ENV === "development" && { 
          details: error instanceof Error ? error.message : String(error) 
        }),
      },
      { status: 500 }
    );
  }
}
