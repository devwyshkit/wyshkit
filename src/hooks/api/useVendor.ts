"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import type { Vendor } from "@/types/vendor";
import type { Product } from "@/types/product";

interface UseVendorResult {
  vendor: Vendor | null;
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useVendor(id: string | null): UseVendorResult {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendor = useCallback(async () => {
    // Don't fetch on server-side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    if (!id || typeof id !== 'string' || id.trim() === '') {
      setError("Invalid vendor ID");
      setLoading(false);
      setVendor(null);
      setProducts([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<{
        vendor: Vendor;
        products: Product[];
      }>(`/vendors/${id}`);

      // Validate response exists and has required properties
      if (!response || typeof response !== 'object') {
        throw new Error("Invalid response from server");
      }

      if (!response.vendor) {
        throw new Error("Vendor not found");
      }

      setVendor(response.vendor);
      setProducts(Array.isArray(response.products) ? response.products : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch vendor";
      setError(errorMessage);
      setVendor(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  return {
    vendor,
    products,
    loading,
    error,
    refetch: fetchVendor,
  };
}


