"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Vendor } from "@/types/vendor";
import type { VendorQueryInput } from "@/lib/validations/vendors";
import { deduplicateRequest, generateCacheKey } from "@/lib/utils/request-dedup";
import { logger } from "@/lib/utils/logger";

interface UseVendorsResult {
  vendors: Vendor[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useVendors(query?: Partial<VendorQueryInput>): UseVendorsResult {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Swiggy Dec 2025 pattern: Memoize query object to prevent unnecessary re-fetches
  const memoizedQuery = useMemo(() => query, [
    query?.city,
    query?.zone,
    query?.status,
    query?.limit,
    query?.offset,
    query?.search,
    query?.sortBy,
    query?.sortOrder,
    query?.lat,
    query?.lng,
  ]);

  const fetchVendors = useCallback(async () => {
    // Don't fetch on server-side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // Generate cache key for request deduplication
    const cacheKey = generateCacheKey('vendors', memoizedQuery || {});

    // Swiggy Dec 2025 pattern: Deduplicate concurrent requests
    await deduplicateRequest(cacheKey, async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabaseClient();
        if (!supabase) {
          setError("Service temporarily unavailable");
          setVendors([]);
          setLoading(false);
          return;
        }

        // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
        let supabaseQuery = supabase
          .from('vendors')
          .select('id, name, description, image, city, rating, is_online, zones, is_hyperlocal, max_delivery_radius');
        // Removed is_online filter - RLS handles all visibility logic, no redundant application-level filters

        if (memoizedQuery?.city) {
          supabaseQuery = supabaseQuery.eq('city', memoizedQuery.city);
        }

        // Swiggy Dec 2025 pattern: RLS policy is source of truth - it already filters by vendor status
        // Only apply explicit status filter if user explicitly requests a different status
        if (memoizedQuery?.status) {
          supabaseQuery = supabaseQuery.eq('status', memoizedQuery.status);
        }
        // Note: RLS policy "Public can view active vendors" already filters by status='approved' for public access

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

        logger.debug("[useVendors] Executing query", { 
          query: memoizedQuery,
          hasSupabaseClient: !!supabase 
        });

        const { data, error: queryError } = await supabaseQuery;

        if (queryError) {
          // Swiggy Dec 2025 pattern: Detailed error logging for debugging RLS issues
          logger.error("[useVendors] Supabase query failed", {
            error: queryError.message,
            code: queryError.code,
            details: queryError.details,
            hint: queryError.hint,
            // Log RLS-related errors specifically
            isRLSError: queryError.code === '42501' || queryError.message?.includes('permission denied'),
            query: memoizedQuery,
          });
          setError(queryError.message || "Failed to fetch vendors");
          setVendors([]);
          return;
        }

        logger.debug("[useVendors] Query successful", { 
          vendorCount: data?.length || 0,
          sampleVendors: data?.slice(0, 3).map((v: any) => ({ id: v.id, name: v.name, status: v.status, is_online: v.is_online }))
        });

        // Map Supabase response (snake_case) to camelCase
        const formattedVendors: Vendor[] = (data || []).map((v: any) => ({
          id: v.id,
          name: v.name || "",
          description: v.description || "",
          image: v.image || "",
          city: v.city || "",
          rating: v.rating ? parseFloat(v.rating) : 0,
          deliveryTime: v.is_hyperlocal ? "30-60 mins" : "2-3 days",
          distance: v.max_delivery_radius ? `${v.max_delivery_radius} km` : "N/A",
          tags: Array.isArray(v.zones) ? v.zones : [],
          isHyperlocal: v.is_hyperlocal ?? true,
          isOnline: v.is_online,
        }));

        setVendors(formattedVendors);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch vendors";
        setError(errorMessage);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    });
  }, [memoizedQuery]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return {
    vendors,
    loading,
    error,
    refetch: fetchVendors,
  };
}


