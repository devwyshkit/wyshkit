import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/client";

/**
 * Admin Vendors API
 * Swiggy Dec 2025 pattern: Direct database queries, strict auth, no dev fallbacks.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - admin access required" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      logger.error("[Admin Vendors] Supabase client not available");
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase.from("vendors").select("*");

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data: vendorList, error: vendorError } = await query;

    if (vendorError) {
      logger.error("[Admin Vendors] Failed to fetch vendors", vendorError);
      return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
    }

    const vendorsWithOrders = await Promise.all(
      (vendorList || []).map(async (v) => {
        const { count } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("vendor_id", v.id);

        return {
          id: v.id,
          name: v.name,
          description: v.description,
          image: v.image,
          city: v.city,
          status: v.status,
          onboardingStatus: v.onboarding_status,
          createdAt: v.created_at,
          userId: v.user_id,
          rating: parseFloat(v.rating || "0"),
          totalOrders: count || 0,
        };
      })
    );

    logger.info("[Admin Vendors] Vendors fetched successfully", { count: vendorsWithOrders.length });

    return NextResponse.json(vendorsWithOrders);
  } catch (error) {
    logger.error("[Admin Vendors] Critical failure", error);
    return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
  }
}
