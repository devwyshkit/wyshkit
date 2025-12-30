import { NextResponse } from "next/server";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { requireAuth, AuthError } from "@/lib/auth/server";
import { logger } from "@/lib/utils/logger";

/**
 * Check if user can review a product
 * Returns true if user has a delivered order containing this product
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: productId } = await params;

    // Use authenticated Supabase client (has auth context for RLS)
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Check if user has a delivered order for this product using Supabase client (RLS compatible)
    const { data: deliveredOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, items')
      .eq('customer_id', user.id)
      .eq('status', 'delivered');

    if (ordersError) {
      logger.error("[GET /api/products/[id]/can-review] Failed to fetch orders", ordersError);
      return NextResponse.json(
        { error: "Failed to check review eligibility" },
        { status: 500 }
      );
    }

    // Check if any order contains this product
    const canReview = (deliveredOrders || []).some(order => {
      const items = order.items as Array<{ productId: string }> | null;
      return items?.some(item => item.productId === productId);
    });

    return NextResponse.json({ canReview });
  } catch (error) {
    logger.error("[GET /api/products/[id]/can-review] Failed", error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to check review eligibility" },
      { status: 500 }
    );
  }
}



