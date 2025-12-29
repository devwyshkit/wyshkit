import { NextResponse } from "next/server";
import { vendorIdSchema } from "@/lib/validations/vendors";
import { logger } from "@/lib/utils/logger";
import { getSupabaseServiceClient } from "@/lib/supabase/client";

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
    const supabase = getSupabaseServiceClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable", code: "DATABASE_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", id)
      .single();

    if (vendorError || !vendor) {
      logger.warn("[API /vendors/[id]] Vendor not found:", id);
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const { data: vendorProducts, error: productsError } = await supabase
      .from("products")
      .select("*")
      .eq("vendor_id", id)
      .eq("is_active", true);

    if (productsError) {
      logger.error("[API /vendors/[id]] Failed to fetch products", productsError);
    }

    const formattedVendor = {
      id: vendor.id,
      name: vendor.name || "",
      description: vendor.description || "",
      image: vendor.image || "",
      rating: vendor.rating ? parseFloat(vendor.rating) : 0,
      deliveryTime: vendor.is_hyperlocal ? "30-60 mins" : "2-3 days",
      distance: vendor.max_delivery_radius ? `${vendor.max_delivery_radius} km` : "N/A",
      tags: Array.isArray(vendor.zones) ? vendor.zones : [],
      deliveryZones: {
        intracity: Array.isArray(vendor.zones) ? vendor.zones : [],
        intercity: vendor.intercity_enabled && vendor.city ? [vendor.city] : [],
      },
      city: vendor.city || "",
      isHyperlocal: vendor.is_hyperlocal ?? true,
      intercityEnabled: vendor.intercity_enabled ?? false,
    };

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
    }));

    logger.info("[API /vendors/[id]] Returning vendor with", formattedProducts.length, "products");
    return NextResponse.json({ vendor: formattedVendor, products: formattedProducts });
  } catch (error) {
    logger.error("[API /vendors/[id]] Error", error);
    return NextResponse.json(
      { error: "Unable to load vendor information", code: "VENDOR_FETCH_FAILED" },
      { status: 500 }
    );
  }
}
