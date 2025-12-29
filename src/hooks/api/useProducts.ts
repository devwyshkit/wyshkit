"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import type { Product } from "@/types/product";
import type { ProductQueryInput } from "@/lib/validations/products";

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProducts(query?: Partial<ProductQueryInput>): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    // Don't fetch on server-side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query?.category) params.set("category", query.category);
      if (query?.vendorId) params.set("vendorId", query.vendorId);
      if (query?.isActive !== undefined) params.set("isActive", query.isActive.toString());
      if (query?.search) params.set("search", query.search);
      if (query?.limit) params.set("limit", query.limit.toString());
      if (query?.offset) params.set("offset", query.offset.toString());

      const response = await apiClient.get<{ products: Product[] }>(
        `/products${params.toString() ? `?${params.toString()}` : ""}`
      );

      // Validate response exists and has required properties
      if (!response || typeof response !== 'object') {
        setError("Invalid response from server");
        setProducts([]);
        return;
      }

      setProducts(Array.isArray(response.products) ? response.products : []);
      
      // Don't show error if we got empty array from 503 (expected when DB unavailable)
      // The UI will show empty state instead
      if (Array.isArray(response.products) && response.products.length === 0 && (response as { _devMode?: boolean })._devMode) {
        // Using mock data in development - no error needed
        setError(null);
      }
    } catch (err) {
      // Only show error if it's not a 503 with empty array (handled by API client)
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch products";
      // Don't show error for expected 503 responses - empty state is better UX
      if (errorMessage.includes("Service temporarily unavailable") || errorMessage.includes("503")) {
        setError(null);
        setProducts([]);
      } else {
        setError(errorMessage);
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  }, [
    query?.category,
    query?.vendorId,
    query?.isActive,
    query?.search,
    query?.limit,
    query?.offset,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
}


