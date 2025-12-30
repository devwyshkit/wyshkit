import { NextResponse } from "next/server";
import { productQuerySchema } from "@/lib/validations/products";
import { logger } from "@/lib/utils/logger";
import { normalizeQueryParam } from "@/lib/utils/api-helpers";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { getStandardProductFields } from "@/lib/utils/product-query-fields";
import { classifySupabaseError } from "@/lib/utils/error-classification";

export async function GET(request: Request) {
  logger.debug("[API /products] Request received");
  try {
    const { searchParams } = new URL(request.url);

    const validationResult = productQuerySchema.safeParse({
      category: normalizeQueryParam(searchParams.get("category")),
      vendorId: normalizeQueryParam(searchParams.get("vendorId")),
      isActive: normalizeQueryParam(searchParams.get("isActive")),
      limit: normalizeQueryParam(searchParams.get("limit")),
      offset: normalizeQueryParam(searchParams.get("offset")),
      search: normalizeQueryParam(searchParams.get("search")),
      sortBy: normalizeQueryParam(searchParams.get("sortBy")),
      sortOrder: normalizeQueryParam(searchParams.get("sortOrder")),
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { category, vendorId, limit, offset, search, sortBy, sortOrder } = validationResult.data;

    // Swiggy Dec 2025 pattern: Use regular client for public data - RLS handles access control
    const supabase = await createSupabaseServerClientWithRequest(request);

    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable", code: "DATABASE_UNAVAILABLE", products: [] },
        { status: 503 }
      );
    }

    logger.debug("[API /products] Supabase client initialized, building query", { category, vendorId, search, sortBy });

    // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
    // RLS policy is source of truth - it already filters by is_active and vendor status
    // Use standard product fields for consistency across all queries
    let query = supabase.from("products").select(getStandardProductFields());

    if (category) {
      query = query.eq("category", category);
      logger.debug("[API /products] Added category filter", { category });
    }

    if (vendorId) {
      query = query.eq("vendor_id", vendorId);
      logger.debug("[API /products] Added vendorId filter", { vendorId });
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      logger.debug("[API /products] Added search filter", { search });
    }

    const orderColumn = sortBy === "price" ? "price" : sortBy === "name" ? "name" : "created_at";
    const ascending = sortOrder === "asc";
    query = query.order(orderColumn, { ascending });

    query = query.range(offset || 0, (offset || 0) + (limit || 50) - 1);

    logger.debug("[API /products] Executing query");
    const { data: dbProducts, error } = await query;

    if (error) {
      const classifiedError = classifySupabaseError(error, { vendorId });
      // Swiggy Dec 2025 pattern: Detailed error logging for debugging RLS issues
      logger.error("[API /products] Supabase query failed", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        query: { category, vendorId, search, sortBy, sortOrder },
        classifiedError,
      });
      return NextResponse.json(
        { 
          error: classifiedError.message, 
          code: classifiedError.code, 
          products: [] 
        },
        { status: classifiedError.status }
      );
    }

    logger.debug("[API /products] Query successful", { 
      productCount: dbProducts?.length || 0,
      sampleProducts: dbProducts?.slice(0, 3).map(p => ({ id: p.id, name: p.name, vendor_id: p.vendor_id }))
    });

    const formattedProducts = (dbProducts || []).map((p) => ({
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
      averageRating: 0,
    }));

    logger.info("[API /products] Returning", formattedProducts.length, "products");
    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    const classifiedError = classifySupabaseError(error);
    logger.error("[API /products] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      classifiedError,
    });
    
    return NextResponse.json(
      { 
        error: classifiedError.message, 
        code: classifiedError.code, 
        products: [] 
      },
      { status: classifiedError.status }
    );
  }
}
