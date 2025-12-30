/**
 * Vendor Earnings API
 * Swiggy Dec 2025 pattern: Centralized vendor earnings tracking, no dev fallbacks.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days

    // Use authenticated Supabase client (has auth context for RLS)
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      logger.error("[Vendor Earnings] Supabase client not available");
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    // Get vendor ID from user ID using Supabase client
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (vendorError || !vendorData) {
      if (vendorError?.code === 'PGRST116') {
        return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
      }
      logger.error("[Vendor Earnings] Failed to fetch vendor", vendorError);
      return NextResponse.json({ error: "Failed to fetch vendor profile" }, { status: 500 });
    }

    const vendorId = vendorData.id;
    const periodDays = parseInt(period);
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Calculate total earnings (all completed orders) using Supabase RPC or aggregation
    // Supabase doesn't have direct sum aggregation in select, so we'll fetch and sum client-side
    const { data: totalOrders, error: totalError } = await supabase
      .from('orders')
      .select('vendor_amount')
      .eq('vendor_id', vendorId)
      .eq('payment_status', 'completed');

    if (totalError) {
      logger.error("[Vendor Earnings] Failed to fetch total earnings", totalError);
      return NextResponse.json({ error: "Failed to calculate earnings" }, { status: 500 });
    }

    const totalEarnings = (totalOrders || []).reduce((sum, order) => {
      return sum + parseFloat(order.vendor_amount || "0");
    }, 0);

    // Calculate period earnings
    const { data: periodOrders, error: periodError } = await supabase
      .from('orders')
      .select('vendor_amount')
      .eq('vendor_id', vendorId)
      .eq('payment_status', 'completed')
      .gte('created_at', periodStart.toISOString());

    if (periodError) {
      logger.error("[Vendor Earnings] Failed to fetch period earnings", periodError);
      return NextResponse.json({ error: "Failed to calculate earnings" }, { status: 500 });
    }

    const periodEarnings = (periodOrders || []).reduce((sum, order) => {
      return sum + parseFloat(order.vendor_amount || "0");
    }, 0);

    // Calculate pending earnings (orders with pending payment)
    const { data: pendingOrders, error: pendingError } = await supabase
      .from('orders')
      .select('vendor_amount')
      .eq('vendor_id', vendorId)
      .eq('payment_status', 'pending');

    if (pendingError) {
      logger.error("[Vendor Earnings] Failed to fetch pending earnings", pendingError);
      return NextResponse.json({ error: "Failed to calculate earnings" }, { status: 500 });
    }

    const pendingEarnings = (pendingOrders || []).reduce((sum, order) => {
      return sum + parseFloat(order.vendor_amount || "0");
    }, 0);

    // Count completed orders in period
    // Swiggy Dec 2025 pattern: Select specific field instead of select('*') for count queries
    const { count: completedOrders, error: countError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('payment_status', 'completed')
      .gte('created_at', periodStart.toISOString());

    if (countError) {
      logger.error("[Vendor Earnings] Failed to count orders", countError);
      return NextResponse.json({ error: "Failed to calculate earnings" }, { status: 500 });
    }

    return NextResponse.json({
      totalEarnings,
      periodEarnings,
      pendingEarnings,
      completedOrders,
      period: periodDays,
    });
  } catch (error) {
    logger.error("[Vendor Earnings] Critical failure", error);
    return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
  }
}
