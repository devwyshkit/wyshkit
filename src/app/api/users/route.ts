import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { isAuthError, isErrorWithStatus, formatApiError } from "@/lib/types/api-errors";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const userId = user.id;

    if (!db) {
      logger.warn("[API /users] Database not available");
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRecords.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userRecords[0];

    return NextResponse.json({
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        city: userData.city,
        createdAt: userData.createdAt?.toISOString(),
        updatedAt: userData.updatedAt?.toISOString(),
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      logger.warn("[API /users] Authentication required");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    logger.error("[API /users] GET error", error);
    const errorResponse = formatApiError(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth(request);
    const userId = user.id;
    
    const body = await request.json();
    const { userId: _, ...updateData } = body;

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const updateFields: Partial<typeof users.$inferSelect> = {};
    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.email !== undefined) updateFields.email = updateData.email;
    if (updateData.city !== undefined) updateFields.city = updateData.city;
    updateFields.updatedAt = new Date();

    const [updatedUser] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, userId))
      .returning();

    logger.info("[API /users] Updated user", userId);

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        city: updatedUser.city,
        createdAt: updatedUser.createdAt?.toISOString(),
        updatedAt: updatedUser.updatedAt?.toISOString(),
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      logger.warn("[API /users] Authentication required");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    logger.error("[API /users] PUT error", error);
    const errorResponse = formatApiError(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
