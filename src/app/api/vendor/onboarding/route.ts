import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";

const onboardingSchema = z.object({
  businessName: z.string().min(1),
  gstin: z.string().optional(),
  pan: z.string().min(1),
  storeAddress: z.string().min(1),
  bankAccount: z.object({
    accountNumber: z.string().min(1),
    ifsc: z.string().min(1),
    beneficiaryName: z.string().min(1),
  }),
  maxDeliveryRadius: z.number().default(10),
  intercityEnabled: z.boolean().default(false),
  storePhotos: z.array(z.string()).min(1),
  documents: z.object({
    gstin: z.string().optional(),
    pan: z.string().min(1),
    cheque: z.string().min(1),
  }),
});

/**
 * POST /api/vendor/onboarding - Submit vendor onboarding data
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.role !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = onboardingSchema.parse(body);

    // Get vendor
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.userId, user.id))
      .limit(1);

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Update vendor with onboarding data
    await db
      .update(vendors)
      .set({
        name: validatedData.businessName,
        onboardingStatus: "submitted",
        onboardingData: {
          ...validatedData,
          operatingHours: {}, // Default empty
          zones: [], // Legacy
        },
        gstin: validatedData.gstin,
        pan: validatedData.pan,
        bankAccount: validatedData.bankAccount,
        storeAddress: validatedData.storeAddress,
        maxDeliveryRadius: validatedData.maxDeliveryRadius,
        intercityEnabled: validatedData.intercityEnabled,
        updatedAt: new Date(),
      } as any)
      .where(eq(vendors.id, vendor.id));

    logger.info(`[Vendor Onboarding] Submitted for vendor: ${vendor.id}`);

    return NextResponse.json({
      success: true,
      message: "Onboarding data submitted successfully for review",
    });
  } catch (error) {
    logger.error("[Vendor Onboarding] Failed", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
