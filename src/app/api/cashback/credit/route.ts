import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wallet, walletTransactions, orders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth, AuthError } from "@/lib/auth/server";
import { isAuthError, isErrorWithStatus, formatApiError } from "@/lib/types/api-errors";
import { calculateCashback } from "@/lib/utils/cashback";
import { appConfig } from "@/lib/config/app";
import { isDevelopment } from "@/lib/config/env";

/**
 * POST /api/cashback/credit
 * Credit cashback to user's wallet after order delivery
 * Called when order status changes to "delivered"
 */
export async function POST(request: Request) {
  try {
    // Admin or system call - check auth
    const user = await requireAuth(request);
    
    // Only admin or system can credit cashback
    // For now, allow authenticated users (will be restricted to admin/system later)
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!db) {
      if (isDevelopment) {
        logger.warn("[API /cashback/credit] Development mode: Using mock cashback credit (database not available)");
        // Mock cashback calculation
        const mockOrderTotal = 1000;
        const mockCashbackAmount = calculateCashback(mockOrderTotal);
        return NextResponse.json({
          success: true,
          cashbackAmount: mockCashbackAmount,
          newBalance: mockCashbackAmount,
          _devMode: true,
        });
      }
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    // Fetch order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if order is delivered
    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "Order must be delivered to credit cashback" },
        { status: 400 }
      );
    }

    // Check if cashback already credited
    const existingCredit = await db
      .select()
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.orderId, orderId),
          eq(walletTransactions.type, "credit")
        )
      )
      .limit(1);

    if (existingCredit.length > 0) {
      return NextResponse.json(
        { error: "Cashback already credited for this order" },
        { status: 400 }
      );
    }

    // Calculate cashback (10% of order total)
    const orderTotal = parseFloat(order.total);
    const cashbackAmount = calculateCashback(orderTotal);

    // Get or create wallet
    let [userWallet] = await db
      .select()
      .from(wallet)
      .where(eq(wallet.userId, order.customerId))
      .limit(1);

    if (!userWallet) {
      // Auto-create wallet if it doesn't exist
      [userWallet] = await db
        .insert(wallet)
        .values({
          userId: order.customerId,
          balance: "0",
        })
        .returning();
    }

    // Update wallet balance
    const newBalance = parseFloat(userWallet.balance) + cashbackAmount;
    await db
      .update(wallet)
      .set({ balance: newBalance.toString() })
      .where(eq(wallet.id, userWallet.id));

    // Create transaction record
    await db.insert(walletTransactions).values({
      walletId: userWallet.id,
      type: "credit",
      amount: cashbackAmount.toString(),
      description: `Cashback for order ${order.orderNumber}`,
      orderId: order.id,
    });

    logger.info("[API /cashback/credit] Credited cashback", {
      orderId,
      customerId: order.customerId,
      amount: cashbackAmount,
      newBalance,
    });

    return NextResponse.json({
      success: true,
      cashbackAmount,
      newBalance,
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      logger.warn("[API /cashback/credit] Authentication required");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    logger.error("[API /cashback/credit] Error", error);
    const errorResponse = formatApiError(error);
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}

