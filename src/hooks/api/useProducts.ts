"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Product } from "@/types/product";
import type { ProductQueryInput } from "@/lib/validations/products";
import { deduplicateRequest, generateCacheKey } from "@/lib/utils/request-dedup";
import { getStandardProductFields } from "@/lib/utils/product-query-fields";
import { logger } from "@/lib/utils/logger";

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

  // Swiggy Dec 2025 pattern: Memoize query object to prevent unnecessary re-fetches
  const memoizedQuery = useMemo(() => query, [
    query?.category,
    query?.vendorId,
    query?.limit,
    query?.offset,
    query?.search,
    query?.sortBy,
    query?.sortOrder,
  ]);

  const fetchProducts = useCallback(async () => {
    // Don't fetch on server-side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // Generate cache key for request deduplication
    const cacheKey = generateCacheKey('products', memoizedQuery || {});

    // Swiggy Dec 2025 pattern: Deduplicate concurrent requests
    await deduplicateRequest(cacheKey, async () => {
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

        // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
        // RLS policy is source of truth - it already filters by is_active and vendor status
        // Use standard product fields for consistency across all queries
        let supabaseQuery = supabase
          .from('products')
          .select(getStandardProductFields());

        if (memoizedQuery?.category) {
          supabaseQuery = supabaseQuery.eq('category', memoizedQuery.category);
        }

        if (memoizedQuery?.vendorId) {
          supabaseQuery = supabaseQuery.eq('vendor_id', memoizedQuery.vendorId);
        }

        if (memoizedQuery?.search) {
          supabaseQuery = supabaseQuery.ilike('name', `%${memoizedQuery.search}%`);
        }

        if (memoizedQuery?.limit) {
          supabaseQuery = supabaseQuery.limit(memoizedQuery.limit);
        }

        if (memoizedQuery?.offset) {
          supabaseQuery = supabaseQuery.range(memoizedQuery.offset, memoizedQuery.offset + (memoizedQuery.limit || 50) - 1);
        }

        if (memoizedQuery?.sortBy) {
          const ascending = memoizedQuery.sortOrder !== 'desc';
          supabaseQuery = supabaseQuery.order(memoizedQuery.sortBy, { ascending });
        } else {
          supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
        }

        logger.debug("[useProducts] Executing query", { 
          query: memoizedQuery,
          hasSupabaseClient: !!supabase 
        });

        const { data, error: queryError } = await supabaseQuery;

        if (queryError) {
          // Swiggy Dec 2025 pattern: Detailed error logging for debugging RLS issues
          logger.error("[useProducts] Supabase query failed", {
            error: queryError.message,
            code: queryError.code,
            details: queryError.details,
            hint: queryError.hint,
            // Log RLS-related errors specifically
            isRLSError: queryError.code === '42501' || queryError.message?.includes('permission denied'),
            query: memoizedQuery,
          });
          setError(queryError.message || "Failed to fetch products");
          setProducts([]);
          setLoading(false); // CRITICAL FIX: Always set loading to false on error
          return;
        }

        logger.debug("[useProducts] Query successful", { 
          productCount: data?.length || 0,
          sampleProducts: data?.slice(0, 3).map((p: any) => ({ id: p.id, name: p.name, vendor_id: p.vendor_id }))
        });

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
          hsnCode: p.hsn_code,
          materialComposition: p.material_composition,
          dimensions: p.dimensions,
          weightGrams: p.weight_grams,
          warranty: p.warranty,
          countryOfOrigin: p.country_of_origin,
          manufacturerName: p.manufacturer_name,
          manufacturerAddress: p.manufacturer_address,
          mockupSlaHours: p.mockup_sla_hours,
          customizationSchema: p.customization_schema,
        }));

        setProducts(formattedProducts);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch products";
        setError(errorMessage);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    });
  }, [memoizedQuery]);

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
