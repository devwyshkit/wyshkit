import { NextResponse } from "next/server";
import { createAddressSchema } from "@/lib/validations/addresses";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { isAuthError, isErrorWithStatus, formatApiError } from "@/lib/types/api-errors";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const userId = user.id;

    // Swiggy Dec 2025 pattern: Use regular client for authenticated requests - RLS handles access control
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
    const { data: userAddresses, error } = await supabase
      .from("addresses")
      .select("id, user_id, recipient_name, phone, address, city, pincode, lat, lng, label, is_default, created_at, updated_at")
      .eq("user_id", userId)
      .order("is_default", { ascending: false });

    if (error) throw error;

    const formattedAddresses = (userAddresses || []).map((addr) => ({
      id: addr.id,
      userId: addr.user_id,
      recipientName: addr.recipient_name,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      pincode: addr.pincode,
      lat: addr.lat ? parseFloat(addr.lat) : undefined,
      lng: addr.lng ? parseFloat(addr.lng) : undefined,
      label: (addr.label as 'Home' | 'Work' | 'Other') || 'Home',
      isDefault: addr.is_default,
      createdAt: addr.created_at,
      updatedAt: addr.updated_at,
    }));

    logger.info("[API /addresses] Fetched", formattedAddresses.length, "addresses for user", userId);
    return NextResponse.json({ addresses: formattedAddresses });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    logger.error("[API /addresses] GET error", error);
    return NextResponse.json(formatApiError(error), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const userId = user.id;

    const body = await request.json();
    const { userId: _, ...addressData } = body;
    
    const validationResult = createAddressSchema.safeParse({
      ...addressData,
      userId,
    });
    
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

    if (data.isDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);
    }

    const { data: newAddress, error } = await supabase
      .from("addresses")
      .insert({
        user_id: userId,
        recipient_name: data.recipientName,
        phone: data.phone,
        address: data.address,
        city: data.city,
        pincode: data.pincode,
        lat: data.lat?.toString(),
        lng: data.lng?.toString(),
        label: data.label || 'Home',
        is_default: data.isDefault || false,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info("[API /addresses] Created address", newAddress.id, "for user", userId);

    return NextResponse.json({
      address: {
        id: newAddress.id,
        userId: newAddress.user_id,
        recipientName: newAddress.recipient_name,
        phone: newAddress.phone,
        address: newAddress.address,
        city: newAddress.city,
        pincode: newAddress.pincode,
        lat: newAddress.lat ? parseFloat(newAddress.lat) : undefined,
        lng: newAddress.lng ? parseFloat(newAddress.lng) : undefined,
        label: (newAddress.label as 'Home' | 'Work' | 'Other') || 'Home',
        isDefault: newAddress.is_default,
        createdAt: newAddress.created_at,
        updatedAt: newAddress.updated_at,
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    logger.error("[API /addresses] POST error", error);
    return NextResponse.json(formatApiError(error), { status: 500 });
  }
}
