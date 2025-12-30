import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { isAuthError, isErrorWithStatus, formatApiError } from "@/lib/types/api-errors";
import { calculateCashback } from "@/lib/utils/cashback";

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

    // Use service role client for system operations (crediting cashback to customer wallet)
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Fetch order using Supabase client
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, total, customer_id, order_number')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      if (orderError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }
      logger.error("[API /cashback/credit] Failed to fetch order", orderError);
      return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }

    // Check if order is delivered
    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "Order must be delivered to credit cashback" },
        { status: 400 }
      );
    }

    // Check if cashback already credited
    const { data: existingCredit, error: creditCheckError } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('order_id', orderId)
      .eq('type', 'credit')
      .maybeSingle();

    if (creditCheckError && creditCheckError.code !== 'PGRST116') {
      logger.error("[API /cashback/credit] Failed to check existing credit", creditCheckError);
      return NextResponse.json({ error: "Failed to check cashback status" }, { status: 500 });
    }

    if (existingCredit) {
      return NextResponse.json(
        { error: "Cashback already credited for this order" },
        { status: 400 }
      );
    }

    // Calculate cashback (10% of order total)
    const orderTotal = parseFloat(order.total || "0");
    const cashbackAmount = calculateCashback(orderTotal);

    // Get or create wallet using Supabase client
    let { data: userWallet, error: walletError } = await supabase
      .from('wallet')
      .select('id, balance')
      .eq('user_id', order.customer_id)
      .maybeSingle();

    if (walletError && walletError.code !== 'PGRST116') {
      logger.error("[API /cashback/credit] Failed to fetch wallet", walletError);
      return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 });
    }

    if (!userWallet) {
      // Auto-create wallet if it doesn't exist
      const { data: newWallet, error: insertError } = await supabase
        .from('wallet')
        .insert({
          user_id: order.customer_id,
          balance: "0",
        })
        .select()
        .single();

      if (insertError) {
        logger.error("[API /cashback/credit] Failed to create wallet", insertError);
        return NextResponse.json({ error: "Failed to create wallet" }, { status: 500 });
      }
      userWallet = newWallet;
    }

    // Update wallet balance
    const newBalance = parseFloat(userWallet.balance || "0") + cashbackAmount;
    const { error: updateError } = await supabase
      .from('wallet')
      .update({ balance: newBalance.toString() })
      .eq('id', userWallet.id);

    if (updateError) {
      logger.error("[API /cashback/credit] Failed to update wallet", updateError);
      return NextResponse.json({ error: "Failed to update wallet" }, { status: 500 });
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: userWallet.id,
        type: 'credit',
        amount: cashbackAmount.toString(),
        description: `Cashback for order ${order.order_number}`,
        order_id: order.id,
      });

    if (transactionError) {
      logger.error("[API /cashback/credit] Failed to create transaction", transactionError);
      // Don't fail the request - wallet is already updated
    }

    logger.info("[API /cashback/credit] Credited cashback", {
      orderId,
      customerId: order.customer_id,
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

