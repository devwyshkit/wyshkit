import { useState, useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { deduplicateRequest } from "@/lib/utils/request-dedup";

interface Address {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  lat?: number;
  lng?: number;
  label?: 'Home' | 'Work' | 'Other';
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UseAddressesResult {
  addresses: Address[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createAddress: (data: Omit<Address, "id" | "createdAt" | "updatedAt">) => Promise<Address | null>;
  updateAddress: (id: string, data: Partial<Address>) => Promise<Address | null>;
  deleteAddress: (id: string) => Promise<boolean>;
}

export function useAddresses(userId: string | null): UseAddressesResult {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null); // Track previous user ID to prevent redundant fetches

  const fetchAddresses = async () => {
    if (!userId) {
      setLoading(false);
      setAddresses([]);
      return;
    }

    // Swiggy Dec 2025 pattern: Validate userId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      setError("Invalid user ID format");
      setAddresses([]);
      setLoading(false);
      return;
    }

    // Swiggy Dec 2025 pattern: Deduplicate concurrent requests
    await deduplicateRequest(`addresses:${userId}`, async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabaseClient();
        if (!supabase) {
          setError("Service temporarily unavailable");
          setAddresses([]);
          setLoading(false);
          return;
        }

        // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
        // Explicitly filter by user_id to ensure RLS works correctly and prevent 400 errors
        const { data, error: queryError } = await supabase
          .from('addresses')
          .select('id, user_id, recipient_name, phone, address, city, pincode, lat, lng, label, is_default, created_at, updated_at')
          .eq('user_id', userId)
          .order('is_default', { ascending: false });

        if (queryError) {
          // Swiggy Dec 2025 pattern: Handle RLS permission errors explicitly
          if (queryError.code === '42501' || queryError.code === 'PGRST301') {
            setError("Permission denied. Please ensure you are logged in.");
          } else {
            setError(queryError.message || "Failed to fetch addresses");
          }
          setAddresses([]);
          return;
        }

        // Map Supabase response (snake_case) to camelCase
        const formattedAddresses: Address[] = (data || []).map((a: any) => ({
          id: a.id,
          userId: a.user_id,
          recipientName: a.recipient_name,
          phone: a.phone,
          address: a.address,
          city: a.city,
          pincode: a.pincode,
          lat: a.lat ? parseFloat(a.lat) : undefined,
          lng: a.lng ? parseFloat(a.lng) : undefined,
          label: (a.label as 'Home' | 'Work' | 'Other') || 'Home',
          isDefault: a.is_default,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        }));

        setAddresses(formattedAddresses);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch addresses";
        setError(errorMessage);
        setAddresses([]);
      } finally {
        setLoading(false);
      }
    });
  };

  const createAddress = async (data: Omit<Address, "id" | "createdAt" | "updatedAt">): Promise<Address | null> => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Service temporarily unavailable");
        return null;
      }

      // Map camelCase to snake_case for Supabase
      const { data: newAddress, error: insertError } = await supabase
        .from('addresses')
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
          is_default: data.isDefault,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message || "Failed to create address");
        return null;
      }

      await fetchAddresses(); // Refetch to get updated list

      // Map response back to camelCase
      return {
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
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create address";
      setError(errorMessage);
      return null;
    }
  };

  const updateAddress = async (id: string, data: Partial<Address>): Promise<Address | null> => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Service temporarily unavailable");
        return null;
      }

      // Map camelCase to snake_case for Supabase
      const updateData: Record<string, unknown> = {};
      if (data.recipientName !== undefined) updateData.recipient_name = data.recipientName;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.pincode !== undefined) updateData.pincode = data.pincode;
      if (data.lat !== undefined) updateData.lat = data.lat.toString();
      if (data.lng !== undefined) updateData.lng = data.lng.toString();
      if (data.label !== undefined) updateData.label = data.label;
      if (data.isDefault !== undefined) updateData.is_default = data.isDefault;

      const { data: updatedAddress, error: updateError } = await supabase
        .from('addresses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        setError(updateError.message || "Failed to update address");
        return null;
      }

      await fetchAddresses(); // Refetch to get updated list

      // Map response back to camelCase
      return {
        id: updatedAddress.id,
        userId: updatedAddress.user_id,
        recipientName: updatedAddress.recipient_name,
        phone: updatedAddress.phone,
        address: updatedAddress.address,
        city: updatedAddress.city,
        pincode: updatedAddress.pincode,
        lat: updatedAddress.lat ? parseFloat(updatedAddress.lat) : undefined,
        lng: updatedAddress.lng ? parseFloat(updatedAddress.lng) : undefined,
        label: (updatedAddress.label as 'Home' | 'Work' | 'Other') || 'Home',
        isDefault: updatedAddress.is_default,
        createdAt: updatedAddress.created_at,
        updatedAt: updatedAddress.updated_at,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update address";
      setError(errorMessage);
      return null;
    }
  };

  const deleteAddress = async (id: string): Promise<boolean> => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Service temporarily unavailable");
        return false;
      }

      const { error: deleteError } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id);

      if (deleteError) {
        setError(deleteError.message || "Failed to delete address");
        return false;
      }

      await fetchAddresses(); // Refetch to get updated list
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete address";
      setError(errorMessage);
      return false;
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [userId]);

  return {
    addresses,
    loading,
    error,
    refetch: fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
  };
}

