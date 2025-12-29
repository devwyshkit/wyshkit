import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";

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

  const fetchAddresses = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // API route gets userId from session, no need to pass in query
      const response = await apiClient.get<{ addresses: Address[] }>(
        `/addresses`
      );

      // Validate response exists and has required properties
      if (!response || typeof response !== 'object') {
        setError("Invalid response from server");
        setAddresses([]);
        return;
      }

      setAddresses(Array.isArray(response.addresses) ? response.addresses : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch addresses";
      setError(errorMessage);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const createAddress = async (data: Omit<Address, "id" | "createdAt" | "updatedAt">): Promise<Address | null> => {
    try {
      const response = await apiClient.post<{ address: Address }>("/addresses", data);
      await fetchAddresses(); // Refetch to get updated list
      // Validate response
      if (!response || typeof response !== 'object' || !response.address) {
        return null;
      }
      return response.address;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create address";
      setError(errorMessage);
      return null;
    }
  };

  const updateAddress = async (id: string, data: Partial<Address>): Promise<Address | null> => {
    try {
      const response = await apiClient.put<{ address: Address }>(`/addresses/${id}`, data);
      await fetchAddresses(); // Refetch to get updated list
      // Validate response
      if (!response || typeof response !== 'object' || !response.address) {
        return null;
      }
      return response.address;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update address";
      setError(errorMessage);
      return null;
    }
  };

  const deleteAddress = async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/addresses/${id}`);
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

