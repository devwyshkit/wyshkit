import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { products, vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";

const productSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.string().min(1),
  price: z.number().positive(),
  image: z.string().min(1),
  images: z.array(z.string()).optional(),
  isPersonalizable: z.boolean().default(false),
  variants: z.array(z.any()).optional(),
  addOns: z.array(z.any()).optional(),
  hsnCode: z.string().length(6),
  materialComposition: z.string().min(1),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  weightGrams: z.number().int().positive(),
  careInstructions: z.string().optional(),
  warranty: z.string().default("No warranty"),
  countryOfOrigin: z.string().default("India"),
  mockupSlaHours: z.number().int().positive(),
  customizationSchema: z.object({
    requiresText: z.boolean().optional(),
    requiresPhoto: z.boolean().optional(),
    maxTextLength: z.number().optional(),
  }).optional(),
});

/**
 * POST /api/vendor/products - Create a new product
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get vendor profile
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.userId, user.id))
      .limit(1);

    if (!vendor) {
      return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = productSchema.parse(body);

    // Create product
    const [newProduct] = await db
      .insert(products)
      .values({
        vendorId: vendor.id,
        ...validatedData,
        price: validatedData.price.toString(),
        manufacturerName: vendor.name,
        manufacturerAddress: vendor.storeAddress || "",
        isActive: true,
      } as any)
      .returning();

    logger.info(`[Vendor Products] Created product: ${newProduct.id}`);

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    logger.error("[Vendor Products] Create failed", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * GET /api/vendor/products - Get all products for vendor
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.userId, user.id))
      .limit(1);

    if (!vendor) {
      return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
    }

    const vendorProducts = await db
      .select()
      .from(products)
      .where(eq(products.vendorId, vendor.id));

    return NextResponse.json(vendorProducts);
  } catch (error) {
    logger.error("[Vendor Products] Fetch failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
