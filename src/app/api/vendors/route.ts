import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getSupabaseServiceClient } from "@/lib/supabase/client";

export async function GET(request: Request) {
  logger.debug("[API /vendors] Request received");
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const status = searchParams.get("status");

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable", code: "DATABASE_UNAVAILABLE", vendors: [] },
        { status: 503 }
      );
    }

    let query = supabase.from("vendors").select("*");

    if (city) {
      query = query.eq("city", city);
    }

    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.eq("status", "approved");
    }

    query = query.eq("is_online", true);

    const { data: dbVendors, error } = await query;

    if (error) {
      logger.error("[API /vendors] Supabase query failed", error);
      return NextResponse.json(
        { error: "Unable to load vendors", code: "VENDORS_FETCH_FAILED", vendors: [] },
        { status: 500 }
      );
    }

    const formattedVendors = (dbVendors || []).map((v) => ({
      id: v.id,
      userId: v.user_id,
      name: v.name || "",
      description: v.description || "",
      image: v.image || "",
      rating: parseFloat(v.rating || "0"),
      isHyperlocal: v.is_hyperlocal ?? true,
      city: v.city || "",
      zones: Array.isArray(v.zones) ? v.zones : [],
      tags: Array.isArray(v.zones) ? v.zones : [],
      maxDeliveryRadius: v.max_delivery_radius || 10,
      intercityEnabled: v.intercity_enabled ?? false,
      storeAddress: v.store_address || "",
      storeLat: v.store_lat ? parseFloat(v.store_lat) : null,
      storeLng: v.store_lng ? parseFloat(v.store_lng) : null,
      status: v.status || "pending",
      onboardingStatus: v.onboarding_status || "pending",
      isOnline: v.is_online ?? true,
      commissionRate: parseFloat(v.commission_rate || "18"),
      deliveryTime: v.is_hyperlocal ? "30-60 mins" : "2-3 days",
      distance: v.max_delivery_radius ? `${v.max_delivery_radius} km` : "N/A",
    }));

    logger.info("[API /vendors] Returning", formattedVendors.length, "vendors");
    return NextResponse.json({ vendors: formattedVendors });
  } catch (error) {
    logger.error("[API /vendors] Error", error);
    return NextResponse.json(
      { error: "Unable to load vendors", code: "VENDORS_FETCH_FAILED", vendors: [] },
      { status: 500 }
    );
  }
}
