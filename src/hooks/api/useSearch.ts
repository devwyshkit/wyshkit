"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Vendor } from "@/types/vendor";
import type { Product } from "@/types/product";
import { logger } from "@/lib/utils/logger";

// Map occasion slugs to searchable terms
const occasionToSearchTerm = (occasion: string): string => {
  const mapping: Record<string, string> = {
    "birthday": "birthday",
    "anniversary": "anniversary",
    "wedding": "wedding",
    "baby-shower": "baby shower",
    "valentine": "valentine",
    "mothers-day": "mother's day",
  };
  return mapping[occasion.toLowerCase()] || occasion;
};

interface UseSearchResult {
  vendors: Vendor[];
  products: Product[];
  loading: boolean;
  error: string | null;
  search: (query?: string, occasion?: string) => Promise<void>;
}

export function useSearch(initialQuery?: string, initialOccasion?: string): UseSearchResult {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = async (query?: string, occasion?: string) => {
    // If neither query nor occasion, clear results
    if (!query?.trim() && !occasion) {
      setVendors([]);
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Service temporarily unavailable");
        setVendors([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      // Build search term: use query if provided, otherwise map occasion to search term
      let searchTerm = query?.trim() || "";
      if (!searchTerm && occasion) {
        searchTerm = occasionToSearchTerm(occasion);
      } else if (searchTerm && occasion) {
        // Combine both: search term + occasion
        searchTerm = `${searchTerm} ${occasionToSearchTerm(occasion)}`;
      }

      if (!searchTerm.trim()) {
        setVendors([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      // Swiggy Dec 2025 pattern: Direct Supabase queries with parallelization and specific fields
      // Search both vendors and products in parallel for maximum performance
      const [vendorsResult, productsResult] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, name, description, image, city, rating, is_online, zones, is_hyperlocal, intercity_enabled, max_delivery_radius, user_id, review_count, delivery_time, status, created_at, updated_at')
          // Swiggy Dec 2025 pattern: RLS policy is source of truth - it already filters by vendor status
          // Removed is_online filter - RLS handles all visibility logic, no redundant application-level filters
          .ilike('name', `%${searchTerm.trim()}%`),
        supabase
          .from('products')
          .select('id, vendor_id, name, description, price, image, images, category, is_personalizable, variants, add_ons, specs, materials, care_instructions')
          // Swiggy Dec 2025 pattern: RLS policy is source of truth - it already filters by is_active and vendor status
          .or(`name.ilike.%${searchTerm.trim()}%,description.ilike.%${searchTerm.trim()}%`)
      ]);

      // Format vendors (snake_case to camelCase)
      const formattedVendors: Vendor[] = (vendorsResult.data || []).map((v: any) => ({
        id: v.id,
        userId: v.user_id,
        name: v.name || "",
        description: v.description || "",
        image: v.image || "",
        city: v.city || "",
        rating: v.rating ? parseFloat(v.rating) : 0,
        reviewCount: v.review_count || 0,
        deliveryTime: v.delivery_time || "",
        isOnline: v.is_online ?? false,
        status: v.status,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
        tags: Array.isArray(v.zones) ? v.zones : [],
        isHyperlocal: v.is_hyperlocal ?? true,
        deliveryZones: {
          intracity: Array.isArray(v.zones) ? v.zones : [],
          intercity: v.intercity_enabled && v.city ? [v.city] : [],
        },
      }));

      // Format products (snake_case to camelCase)
      const formattedProducts: Product[] = (productsResult.data || []).map((p: any) => ({
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

      if (vendorsResult.error) {
        logger.error("[useSearch] Failed to fetch vendors", vendorsResult.error);
      }
      if (productsResult.error) {
        logger.error("[useSearch] Failed to fetch products", productsResult.error);
      }

      setVendors(formattedVendors);
      setProducts(formattedProducts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to search";
      logger.error("[useSearch] Error", err);
      setError(errorMessage);
      setVendors([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery || initialOccasion) {
      performSearch(initialQuery, initialOccasion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount with initial values

  return {
    vendors,
    products,
    loading,
    error,
    search: performSearch,
  };
}
