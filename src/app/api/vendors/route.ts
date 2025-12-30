import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";

export async function GET(request: Request) {
  logger.debug("[API /vendors] Request received");
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const status = searchParams.get("status");

    // Swiggy Dec 2025 pattern: Use regular client for public data - RLS handles access control
    const supabase = await createSupabaseServerClientWithRequest(request);

    if (!supabase) {
      logger.error("[API /vendors] Supabase client not available");
      return NextResponse.json(
        { error: "Service temporarily unavailable", code: "DATABASE_UNAVAILABLE", vendors: [] },
        { status: 503 }
      );
    }

    logger.debug("[API /vendors] Supabase client initialized, building query", { city, status });

    // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
    let query = supabase.from("vendors").select("id, user_id, name, description, image, rating, city, is_online, status, zones, is_hyperlocal, intercity_enabled, max_delivery_radius, store_address, store_lat, store_lng, onboarding_status, commission_rate, created_at");

    if (city) {
      query = query.eq("city", city);
      logger.debug("[API /vendors] Added city filter", { city });
    }

    // Swiggy Dec 2025 pattern: RLS policy is source of truth - it already filters by vendor status
    // Only apply explicit status filter if user explicitly requests a different status
    if (status) {
      query = query.eq("status", status);
      logger.debug("[API /vendors] Added status filter", { status });
    }
    // Note: RLS policy "Public can view active vendors" already filters by status='approved' for public access
    // Removed is_online filter - RLS handles all visibility logic, no redundant application-level filters

    logger.debug("[API /vendors] Executing query");
    const { data: dbVendors, error } = await query;

    if (error) {
      // Swiggy Dec 2025 pattern: Detailed error logging for debugging RLS issues
      logger.error("[API /vendors] Supabase query failed", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        isRLSError: error.code === '42501' || error.message?.includes('permission denied'),
        query: { city, status },
      });
      return NextResponse.json(
        { error: "Unable to load vendors", code: "VENDORS_FETCH_FAILED", vendors: [] },
        { status: 500 }
      );
    }

    logger.debug("[API /vendors] Query successful", { 
      vendorCount: dbVendors?.length || 0,
      sampleVendors: dbVendors?.slice(0, 3).map(v => ({ id: v.id, name: v.name, status: v.status, is_online: v.is_online }))
    });

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
