"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Product } from "@/types/product";
import { logger } from "@/lib/utils/logger";
import { deduplicateRequest } from "@/lib/utils/request-dedup";

interface UseVendorProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch vendor's own products using direct Supabase query
 * Swiggy Dec 2025 pattern: Get vendor_id from user profile, then filter products explicitly
 * This ensures products are filtered correctly even if RLS isn't fully configured
 */
export function useVendorProducts(): UseVendorProductsResult {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    // Don't fetch on server-side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // Wait for auth to load
    if (!user) {
      setLoading(false);
      setError(null);
      setProducts([]);
      return;
    }

    // Swiggy Dec 2025 pattern: Deduplicate concurrent requests
    await deduplicateRequest(`vendor-products:${user.id}`, async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabaseClient();
        if (!supabase) {
          setError("Service temporarily unavailable");
          setProducts([]);
          setLoading(false);
          return;
        }

        // Swiggy Dec 2025 pattern: Get vendor_id from user's vendor profile first
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (vendorError || !vendorData) {
          setError("Vendor profile not found. Please complete vendor onboarding.");
          setProducts([]);
          setLoading(false);
          return;
        }

        const vendorId = vendorData.id;

        // Swiggy Dec 2025 pattern: Direct Supabase query with explicit vendor_id filtering
        // Filter by vendor_id explicitly to ensure correct results
        // Note: products table doesn't have updated_at column, only created_at
        const { data, error: queryError } = await supabase
          .from('products')
          .select('id, vendor_id, name, description, price, image, images, category, is_personalizable, variants, add_ons, specs, materials, care_instructions, is_active, created_at')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false });

        if (queryError) {
          setError(queryError.message || "Failed to fetch products");
          setProducts([]);
          return;
        }

        // Map Supabase response (snake_case) to camelCase
        const formattedProducts: Product[] = (data || []).map((p: any) => ({
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

        setProducts(formattedProducts);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch products";
        logger.error("[useVendorProducts] Error", err);
        setError(errorMessage);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    });
  }, [user]);

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

