"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Product } from "@/types/product";
import { logger } from "@/lib/utils/logger";
import { deduplicateRequest, generateCacheKey } from "@/lib/utils/request-dedup";
import { getStandardProductFields } from "@/lib/utils/product-query-fields";

interface UseTrendingProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch trending products
 * Swiggy Dec 2025 pattern: Simple, based on recent orders or manual curation
 * For now, returns recently created products (can be enhanced with order-based trending)
 */
export function useTrendingProducts(limit: number = 20): UseTrendingProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendingProducts = useCallback(async () => {
    // Don't fetch on server-side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // CRITICAL FIX: Set loading state BEFORE deduplication
    // This ensures loading state is always set, even if request is deduplicated
    setLoading(true);
    setError(null);

    // Generate cache key for request deduplication
    const cacheKey = generateCacheKey('trending-products', { limit });

    // Swiggy Dec 2025 pattern: CRITICAL FIX - Execute fetch logic directly
    // State updates MUST happen even if request is deduplicated
    const executeFetch = async () => {
      try {

        const supabase = getSupabaseClient();
        if (!supabase) {
          setError("Service temporarily unavailable");
          setProducts([]);
          setLoading(false);
          return;
        }

        // Swiggy Dec 2025 pattern: Fetch trending products
        // For now: Recently created products (RLS handles visibility)
        // Future: Can be enhanced to use order count from recent orders
        // Use standard product fields for consistency
        const { data, error: queryError } = await supabase
          .from('products')
          .select(getStandardProductFields())
          .order('created_at', { ascending: false })
          .limit(limit);

        if (queryError) {
          // Swiggy Dec 2025 pattern: Enhanced error logging with full error object
          const isRLSError = queryError.code === '42501' || 
                            queryError.code === 'PGRST301' ||
                            (queryError.message?.toLowerCase && queryError.message.toLowerCase().includes('permission denied')) ||
                            (queryError.message?.toLowerCase && queryError.message.toLowerCase().includes('row-level security'));
          
          logger.error("[useTrendingProducts] Supabase query failed", {
            error: queryError.message || String(queryError),
            code: queryError.code || 'UNKNOWN',
            details: queryError.details || null,
            hint: queryError.hint || null,
            isRLSError,
            fullError: JSON.stringify(queryError, Object.getOwnPropertyNames(queryError)),
            query: { limit, table: 'products' },
          });
          
          const errorMessage = isRLSError 
            ? "Unable to load products. Please check database permissions."
            : queryError.message || "Failed to fetch trending products";
          
          setError(errorMessage);
          setProducts([]);
          setLoading(false);
          return;
        }

        const productCount = data?.length || 0;
        logger.debug("[useTrendingProducts] Query successful", { 
          productCount,
          sampleIds: Array.isArray(data) ? data.slice(0, 3).map((p: any) => p.id) : [],
          sampleProducts: Array.isArray(data) ? data.slice(0, 3).map((p: any) => ({ id: p.id, name: p.name, vendor_id: p.vendor_id })) : [],
        });
        
        if (productCount === 0) {
          logger.warn("[useTrendingProducts] No products returned from query", {
            limit,
            query: 'products',
            possibleReasons: [
              'No products in database',
              'All products are inactive',
              'All vendors are not approved',
              'RLS policy blocking access'
            ]
          });
          // CRITICAL: Set empty array and loading to false
          setProducts([]);
          setLoading(false);
          return;
        }

        // Map Supabase response (snake_case) to camelCase with validation
        const formattedProducts: Product[] = (Array.isArray(data) ? data : [])
          .map((p: any) => {
            // CRITICAL FIX: Validate required fields
            if (!p.id || !p.name || (p.price === null || p.price === undefined)) {
              logger.warn("[useTrendingProducts] Invalid product data (skipping)", {
                productId: p.id,
                hasName: !!p.name,
                price: p.price,
              });
              return null;
            }
            
            return {
              id: p.id,
              vendorId: p.vendor_id,
              name: p.name || "",
              description: p.description || "",
              price: parseFloat(String(p.price || "0")),
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
            } as Product;
          })
          .filter((p): p is Product => p !== null); // Remove nulls

        // CRITICAL FIX: Log if all products were filtered out
        if (formattedProducts.length === 0 && productCount > 0) {
          logger.error("[useTrendingProducts] All products were invalid after formatting", {
            rawCount: productCount,
            formattedCount: formattedProducts.length,
          });
        }

        // CRITICAL FIX: Always update state, wrapped in try-catch
        try {
          setProducts(formattedProducts);
          logger.debug("[useTrendingProducts] Products state updated", {
            count: formattedProducts.length,
          });
        } catch (stateError) {
          logger.error("[useTrendingProducts] Failed to update products state", stateError);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch trending products";
        logger.error("[useTrendingProducts] Unexpected error", err);
        setError(errorMessage);
        setProducts([]);
      } finally {
        // CRITICAL FIX: Always set loading to false, even on error
        try {
          setLoading(false);
          logger.debug("[useTrendingProducts] Loading set to false");
        } catch (stateError) {
          logger.error("[useTrendingProducts] Failed to update loading state", stateError);
        }
      }
    };

    // Use deduplication for the promise, but state updates happen inside
    try {
      await deduplicateRequest(cacheKey, executeFetch);
    } catch (err) {
      // If deduplicated request fails, ensure loading state is reset
      setLoading(false);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch trending products";
      setError(errorMessage);
      logger.error("[useTrendingProducts] Deduplicated request failed", err);
    }
  }, [limit]);

  useEffect(() => {
    fetchTrendingProducts();
  }, [fetchTrendingProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchTrendingProducts,
  };
}

