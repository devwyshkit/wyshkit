import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { productReviews, orders, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthError } from "@/lib/auth/server";
import { logger } from "@/lib/utils/logger";
import { isDevelopment } from "@/lib/config/env";

const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// GET: Fetch reviews for a product
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check database availability
    if (!db) {
      if (isDevelopment) {
        logger.warn("[GET /api/products/[id]/reviews] Development mode: Using mock reviews (database not available)");
        return NextResponse.json({
          reviews: [],
          averageRating: 0,
          reviewCount: 0,
          _devMode: true,
        });
      }
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    // Fetch reviews with user info
    const reviewsData = await db
      .select({
        id: productReviews.id,
        productId: productReviews.productId,
        userId: productReviews.userId,
        orderId: productReviews.orderId,
        rating: productReviews.rating,
        comment: productReviews.comment,
        createdAt: productReviews.createdAt,
        userName: users.name,
      })
      .from(productReviews)
      .leftJoin(users, eq(productReviews.userId, users.id))
      .where(eq(productReviews.productId, id))
      .orderBy(desc(productReviews.createdAt))
      .limit(50);

    // Transform reviews to include user names
    const reviews = reviewsData.map(r => ({
      id: r.id,
      productId: r.productId,
      userId: r.userId,
      orderId: r.orderId || undefined,
      rating: Number(r.rating),
      comment: r.comment || undefined,
      createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
      userName: r.userName || undefined,
    }));

    // Calculate average rating
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return NextResponse.json({
      reviews,
      averageRating: Number(averageRating.toFixed(1)),
      reviewCount: reviews.length,
    });
  } catch (error) {
    logger.error("[GET /api/products/[id]/reviews] Failed", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST: Create a review (requires auth + delivered order)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: productId } = await params;
    const body = await request.json();
    const { rating, comment } = createReviewSchema.parse(body);

    // Check database availability
    if (!db) {
      if (isDevelopment) {
        logger.warn("[POST /api/products/[id]/reviews] Development mode: Using mock review (database not available)");
        const mockReviewId = `dev-review-${Date.now()}`;
        return NextResponse.json({
          success: true,
          review: {
            id: mockReviewId,
            productId,
            userId: user.id,
            orderId: null,
            rating,
            comment: comment || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          message: "Review submitted successfully",
          _devMode: true,
        });
      }
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    // Check if user has a delivered order for this product
    // Orders store items as JSONB array, so we need to check the items field
    const deliveredOrders = await db
      .select({
        id: orders.id,
        items: orders.items,
      })
      .from(orders)
      .where(
        and(
          eq(orders.customerId, user.id),
          eq(orders.status, "delivered")
        )
      );

    // Check if any order contains this product
    const orderWithProduct = deliveredOrders.find(order => {
      const items = order.items as Array<{ productId: string }> | null;
      return items?.some(item => item.productId === productId);
    });

    if (!orderWithProduct) {
      return NextResponse.json(
        { error: "You can only review products from delivered orders" },
        { status: 403 }
      );
    }

    // Check if user already reviewed this product
    const existingReview = await db
      .select()
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.userId, user.id)
        )
      )
      .limit(1)
      .then((rows) => rows[0] || null);

    if (existingReview) {
      // Update existing review
      const [updated] = await db
        .update(productReviews)
        .set({
          rating,
          comment: comment || null,
          updatedAt: new Date(),
        })
        .where(eq(productReviews.id, existingReview.id))
        .returning();

      logger.info(`[POST /api/products/[id]/reviews] Review updated: ${updated.id}`);
      return NextResponse.json({
        success: true,
        review: updated,
        message: "Review updated successfully",
      });
    }

    // Create new review
    const [newReview] = await db
      .insert(productReviews)
      .values({
        productId,
        userId: user.id,
        orderId: orderWithProduct.id,
        rating,
        comment: comment || null,
      })
      .returning();

    logger.info(`[POST /api/products/[id]/reviews] Review created: ${newReview.id}`);
    return NextResponse.json({
      success: true,
      review: newReview,
      message: "Review submitted successfully",
    });
  } catch (error) {
    logger.error("[POST /api/products/[id]/reviews] Failed", error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: error.status }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}

