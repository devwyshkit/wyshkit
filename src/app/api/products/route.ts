import { NextResponse } from "next/server";
import { productQuerySchema } from "@/lib/validations/products";
import { logger } from "@/lib/utils/logger";
import { normalizeQueryParam } from "@/lib/utils/api-helpers";
import { getSupabaseServiceClient } from "@/lib/supabase/client";

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

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable", code: "DATABASE_UNAVAILABLE", products: [] },
        { status: 503 }
      );
    }

    let query = supabase.from("products").select("*").eq("is_active", true);

    if (category) {
      query = query.eq("category", category);
    }

    if (vendorId) {
      query = query.eq("vendor_id", vendorId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const orderColumn = sortBy === "price" ? "price" : sortBy === "name" ? "name" : "created_at";
    const ascending = sortOrder === "asc";
    query = query.order(orderColumn, { ascending });

    query = query.range(offset || 0, (offset || 0) + (limit || 50) - 1);

    const { data: dbProducts, error } = await query;

    if (error) {
      logger.error("[API /products] Supabase query failed", error);
      return NextResponse.json(
        { error: "Unable to load products", code: "PRODUCTS_FETCH_FAILED", products: [] },
        { status: 500 }
      );
    }

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
      averageRating: 0,
    }));

    logger.info("[API /products] Returning", formattedProducts.length, "products");
    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    logger.error("[API /products] Error", error);
    return NextResponse.json(
      { error: "Unable to load products", code: "PRODUCTS_FETCH_FAILED", products: [] },
      { status: 500 }
    );
  }
}
