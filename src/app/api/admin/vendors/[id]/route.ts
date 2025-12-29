import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors, users, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";

/**
 * GET /api/admin/vendors/[id] - Get vendor details for admin
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id))
      .limit(1);

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Get associated user info
    const [vendorUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, vendor.userId))
      .limit(1);

    return NextResponse.json({
      ...vendor,
      user: vendorUser,
      commissionRate: parseFloat(vendor.commissionRate || "18"),
    });
  } catch (error) {
    logger.error("[API /admin/vendors/[id]] GET Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/vendors/[id] - Update vendor settings (commission, status, etc)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    
    // Update vendor
    await db
      .update(vendors)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, id));

    logger.info(`[Admin] Updated vendor ${id} settings`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[API /admin/vendors/[id]] PATCH Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
