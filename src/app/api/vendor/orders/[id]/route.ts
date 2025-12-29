import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { orders, vendors, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

    // Get vendor ID from user ID
    const [vendor] = await db.select().from(vendors).where(eq(vendors.userId, user.id));

    if (!vendor) {
      return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.vendorId, vendor.id)))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch product names for the items
    const productIds = order.items.map(item => item.productId);
    const orderProducts = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(sql`${products.id} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`);

    const productsMap = orderProducts.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {} as Record<string, string>);

    const formattedOrder = {
      ...order,
      total: parseFloat(order.total || "0"),
      itemTotal: parseFloat(order.itemTotal || "0"),
      deliveryFee: parseFloat(order.deliveryFee || "0"),
      items: order.items.map(item => ({
        ...item,
        productName: productsMap[item.productId] || "Unknown Product"
      })),
      createdAt: order.createdAt?.toISOString(),
      updatedAt: order.updatedAt?.toISOString(),
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    logger.error("[API /vendor/orders/[id]] Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { sql } from "drizzle-orm";
