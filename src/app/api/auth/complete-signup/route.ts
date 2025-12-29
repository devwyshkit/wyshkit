import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";

/**
 * Complete Signup API
 * Swiggy Dec 2025 pattern: Strict validation, direct database updates, no dev fallbacks.
 */
const completeSignupSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, "Invalid phone number format"),
  name: z.string().min(1, "Name is required").max(50, "Name must be less than 50 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, name } = completeSignupSchema.parse(body);

    if (!db) {
      logger.error("[Complete Signup] Database connection not available");
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // Find user by phone
    const user = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please verify OTP first." },
        { status: 404 }
      );
    }

    // Update user with name
    const [updatedUser] = await db
      .update(users)
      .set({
        name: name.trim(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    logger.info(`[Complete Signup] User profile completed: ${updatedUser.id}`);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
      message: "Account created successfully",
    });
  } catch (error) {
    logger.error("[Complete Signup] Failed", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to complete signup. Please try again." },
      { status: 500 }
    );
  }
}
