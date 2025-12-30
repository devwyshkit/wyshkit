import { NextResponse } from "next/server";
import { vendorIdSchema } from "@/lib/validations/vendors";
import { logger } from "@/lib/utils/logger";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { getStandardProductFields } from "@/lib/utils/product-query-fields";
import { classifySupabaseError } from "@/lib/utils/error-classification";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  logger.debug("[API /vendors/[id]] Request received");
  try {
    const { id: rawId } = await params;

    if (!rawId || typeof rawId !== "string" || rawId.trim() === "") {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    const validationResult = vendorIdSchema.safeParse({ id: rawId });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid vendor ID format", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { id } = validationResult.data;
    // Swiggy Dec 2025 pattern: Use regular client for public data - RLS handles access control
    const supabase = await createSupabaseServerClientWithRequest(request);

    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable", code: "DATABASE_UNAVAILABLE" },
        { status: 503 }
      );
    }

    // Swiggy Dec 2025 pattern: Parallel queries with specific fields for maximum performance
    const [vendorResult, productsResult] = await Promise.all([
      supabase
        .from("vendors")
        .select("id, name, description, image, rating, city, is_online, status, zones, is_hyperlocal, intercity_enabled, max_delivery_radius, store_address, store_lat, store_lng, onboarding_status, commission_rate, created_at")
        .eq("id", id)
        .single(),
      supabase
        .from("products")
        .select(getStandardProductFields())
        .eq("vendor_id", id)
        // Swiggy Dec 2025 pattern: RLS policy is source of truth - it already filters by is_active and vendor status
    ]);

    // Handle vendor query errors with proper classification
    if (vendorResult.error) {
      const classifiedError = classifySupabaseError(vendorResult.error, { vendorId: id });
      logger.error("[API /vendors/[id]] Vendor query failed", {
        error: vendorResult.error,
        errorCode: vendorResult.error?.code,
        errorMessage: vendorResult.error?.message,
        errorDetails: vendorResult.error?.details,
        vendorId: id,
        classifiedError,
      });
      
      return NextResponse.json(
        { 
          error: classifiedError.message, 
          code: classifiedError.code 
        },
        { status: classifiedError.status }
      );
    }

    if (!vendorResult.data) {
      logger.warn("[API /vendors/[id]] Vendor not found:", id);
      return NextResponse.json({ error: "Partner not found", code: "NOT_FOUND" }, { status: 404 });
    }

    // Handle products query errors gracefully - don't fail entire request
    if (productsResult.error) {
      const classifiedError = classifySupabaseError(productsResult.error, { vendorId: id });
      logger.error("[API /vendors/[id]] Failed to fetch products", {
        error: productsResult.error,
        errorCode: productsResult.error?.code,
        errorMessage: productsResult.error?.message,
        errorDetails: productsResult.error?.details,
        vendorId: id,
        classifiedError,
      });
      // Swiggy Dec 2025 pattern: Don't fail the entire request if products fail - return empty array
      // The UI can handle empty products gracefully
    }

    const vendor = vendorResult.data;
    const vendorProducts = productsResult.data || [];

    // Swiggy Dec 2025 pattern: Handle zones as JSONB - could be null, array, or object
    let zonesArray: string[] = [];
    if (vendor.zones) {
      if (Array.isArray(vendor.zones)) {
        zonesArray = vendor.zones;
      } else if (typeof vendor.zones === 'string') {
        try {
          const parsed = JSON.parse(vendor.zones);
          zonesArray = Array.isArray(parsed) ? parsed : [];
        } catch {
          zonesArray = [];
        }
      }
    }

    const formattedVendor = {
      id: vendor.id,
      name: vendor.name || "",
      description: vendor.description || "",
      image: vendor.image || "",
      rating: vendor.rating ? parseFloat(vendor.rating) : 0,
      deliveryTime: vendor.is_hyperlocal ? "30-60 mins" : "2-3 days",
      distance: vendor.max_delivery_radius ? `${vendor.max_delivery_radius} km` : "N/A",
      tags: zonesArray,
      deliveryZones: {
        intracity: zonesArray,
        intercity: vendor.intercity_enabled && vendor.city ? [vendor.city] : [],
      },
      city: vendor.city || "",
      isHyperlocal: vendor.is_hyperlocal ?? true,
      isOnline: vendor.is_online ?? false,
      intercityEnabled: vendor.intercity_enabled ?? false,
    };

    // Swiggy Dec 2025 pattern: Map all standard product fields including compliance fields
    const formattedProducts = (vendorProducts || []).map((p) => ({
      id: p.id,
      vendorId: p.vendor_id,
      name: p.name || "",
      description: p.description || "",
      price: parseFloat(p.price || "0"),
      image: p.image || "",
      images: Array.isArray(p.images) ? p.images : [],
      category: p.category || "",
      isPersonalizable: p.is_personalizable ?? false,
      variants: Array.isArray(p.variants) ? p.variants : [],
      addOns: Array.isArray(p.add_ons) ? p.add_ons : [],
      specs: Array.isArray(p.specs) ? p.specs : [],
      materials: Array.isArray(p.materials) ? p.materials : [],
      careInstructions: p.care_instructions || "",
      // Compliance fields
      hsnCode: p.hsn_code,
      materialComposition: p.material_composition,
      dimensions: p.dimensions,
      weightGrams: p.weight_grams,
      warranty: p.warranty,
      countryOfOrigin: p.country_of_origin,
      manufacturerName: p.manufacturer_name,
      manufacturerAddress: p.manufacturer_address,
      mockupSlaHours: p.mockup_sla_hours,
      customizationSchema: p.customization_schema,
    }));

    logger.info("[API /vendors/[id]] Returning vendor with", formattedProducts.length, "products");
    return NextResponse.json({ vendor: formattedVendor, products: formattedProducts });
  } catch (error) {
    // Classify unexpected errors
    const classifiedError = classifySupabaseError(error);
    logger.error("[API /vendors/[id]] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      classifiedError,
    });
    
    // Return appropriate status code based on error classification
    return NextResponse.json(
      { 
        error: classifiedError.message, 
        code: classifiedError.code 
      },
      { status: classifiedError.status }
    );
  }
}
