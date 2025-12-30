import { NextResponse } from "next/server";
import { updateAddressSchema } from "@/lib/validations/addresses";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { isAuthError, isErrorWithStatus, formatApiError } from "@/lib/types/api-errors";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const userId = user.id;
    const { id } = await params;

    // Swiggy Dec 2025 pattern: Use regular client for authenticated requests - RLS handles access control
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
    const { data: address, error } = await supabase
      .from("addresses")
      .select("id, user_id, recipient_name, phone, address, city, pincode, lat, lng, label, is_default, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !address) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({
      address: {
        id: address.id,
        userId: address.user_id,
        recipientName: address.recipient_name,
        phone: address.phone,
        address: address.address,
        city: address.city,
        pincode: address.pincode,
        lat: address.lat ? parseFloat(address.lat) : undefined,
        lng: address.lng ? parseFloat(address.lng) : undefined,
        label: (address.label as 'Home' | 'Work' | 'Other') || 'Home',
        isDefault: address.is_default,
        createdAt: address.created_at,
        updatedAt: address.updated_at,
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    logger.error("[API /addresses/:id] GET error", error);
    return NextResponse.json(formatApiError(error), { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const userId = user.id;
    const { id } = await params;

    const body = await request.json();
    
    const validationResult = updateAddressSchema.safeParse({ ...body, id });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Swiggy Dec 2025 pattern: Use regular client for authenticated requests - RLS handles access control
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const { data: existing } = await supabase
      .from("addresses")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    if (data.isDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);
    }

    const updateData: Record<string, unknown> = {};
    if (data.recipientName) updateData.recipient_name = data.recipientName;
    if (data.phone) updateData.phone = data.phone;
    if (data.address) updateData.address = data.address;
    if (data.city) updateData.city = data.city;
    if (data.pincode) updateData.pincode = data.pincode;
    if (data.lat !== undefined) updateData.lat = data.lat?.toString();
    if (data.lng !== undefined) updateData.lng = data.lng?.toString();
    if (data.label) updateData.label = data.label;
    if (data.isDefault !== undefined) updateData.is_default = data.isDefault;
    updateData.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("addresses")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    logger.info("[API /addresses/:id] Updated address", id);

    return NextResponse.json({
      address: {
        id: updated.id,
        userId: updated.user_id,
        recipientName: updated.recipient_name,
        phone: updated.phone,
        address: updated.address,
        city: updated.city,
        pincode: updated.pincode,
        lat: updated.lat ? parseFloat(updated.lat) : undefined,
        lng: updated.lng ? parseFloat(updated.lng) : undefined,
        label: (updated.label as 'Home' | 'Work' | 'Other') || 'Home',
        isDefault: updated.is_default,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    logger.error("[API /addresses/:id] PATCH error", error);
    return NextResponse.json(formatApiError(error), { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const userId = user.id;
    const { id } = await params;

    // Swiggy Dec 2025 pattern: Use regular client for authenticated requests - RLS handles access control
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const { data: existing } = await supabase
      .from("addresses")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    await supabase.from("addresses").delete().eq("id", id);

    logger.info("[API /addresses/:id] Deleted address", id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    logger.error("[API /addresses/:id] DELETE error", error);
    return NextResponse.json(formatApiError(error), { status: 500 });
  }
}
