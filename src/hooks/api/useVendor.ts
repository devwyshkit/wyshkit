"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Vendor } from "@/types/vendor";
import type { Product } from "@/types/product";
import { logger } from "@/lib/utils/logger";
import { deduplicateRequest } from "@/lib/utils/request-dedup";

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

    // Swiggy Dec 2025 pattern: Deduplicate concurrent requests
    await deduplicateRequest(`vendor:${id}`, async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabaseClient();
        if (!supabase) {
          setError("Service temporarily unavailable");
          setVendor(null);
          setProducts([]);
          setLoading(false);
          return;
        }

        // Swiggy Dec 2025 pattern: Direct Supabase queries with parallelization and specific fields
        // Fetch vendor and products in parallel for maximum performance
        logger.debug(`[useVendor] Fetching vendor and products for vendor_id: ${id}`);
        
        const [vendorResult, productsResult] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, user_id, name, description, image, rating, city, is_online, status, zones, is_hyperlocal, intercity_enabled, max_delivery_radius, store_address, store_lat, store_lng, onboarding_status, commission_rate, created_at')
          .eq('id', id)
          // Swiggy Dec 2025 pattern: RLS is the source of truth - let RLS handle vendor visibility
          .single(),
        supabase
          .from('products')
          .select('id, vendor_id, name, description, price, image, images, category, is_personalizable, variants, add_ons, specs, materials, care_instructions, mockup_sla_hours, hsn_code, material_composition, dimensions, weight_grams, warranty, country_of_origin, manufacturer_name, manufacturer_address')
          .eq('vendor_id', id)
          // Swiggy Dec 2025 pattern: RLS policy is source of truth - it already filters by is_active and vendor status
      ]);

      if (vendorResult.error || !vendorResult.data) {
        logger.warn("[useVendor] Vendor not found or not approved", { 
          vendorId: id, 
          error: vendorResult.error,
          errorCode: vendorResult.error?.code,
          errorMessage: vendorResult.error?.message
        });
        setError(vendorResult.error?.code === 'PGRST116' ? "Partner not found" : "Partner not available");
        setVendor(null);
        setProducts([]);
        return;
      }

      // Log vendor status for debugging
      logger.debug(`[useVendor] Vendor found: ${vendorResult.data.name}, status: ${vendorResult.data.status}`);

      // Swiggy Dec 2025 pattern: Don't silently fail - set error state and exit early
      if (productsResult.error) {
        logger.error("[useVendor] Failed to fetch products", { 
          vendorId: id, 
          error: productsResult.error,
          errorCode: productsResult.error?.code,
          errorMessage: productsResult.error?.message,
          errorDetails: productsResult.error?.details
        });
        
        // Check if it's an RLS/permission error
        const isPermissionError = productsResult.error?.code === '42501' || 
                                  productsResult.error?.code === 'PGRST301' ||
                                  productsResult.error?.message?.toLowerCase().includes('permission') ||
                                  productsResult.error?.message?.toLowerCase().includes('policy') ||
                                  productsResult.error?.message?.toLowerCase().includes('row-level security');
        
        // Set error state so UI can show error message
        if (isPermissionError) {
          setError("Unable to load products. Please check database permissions.");
        } else {
          setError(`Failed to load products: ${productsResult.error?.message || 'Unknown error'}`);
        }
        setProducts([]);
        setLoading(false);
        return; // CRITICAL: Exit early - don't try to format products when error exists
      }

      // Only format products if there was NO error
      const productCount = productsResult.data?.length || 0;
      
      // Swiggy Dec 2025 pattern: Comprehensive debug logging at every step
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`[useVendor] Vendor ID being queried:`, id);
        logger.debug(`[useVendor] Vendor status:`, vendorResult.data?.status);
        logger.debug(`[useVendor] Raw products data:`, productsResult.data);
        logger.debug(`[useVendor] Products result error:`, productsResult.error);
        logger.debug(`[useVendor] Products result data length:`, productsResult.data?.length);
        logger.debug(`[useVendor] Join query result structure:`, {
          hasVendorStatus: productsResult.data?.some((p: any) => p.vendors?.status),
          sampleProduct: productsResult.data?.[0],
          vendorStatusInProducts: productsResult.data?.map((p: any) => p.vendors?.status)
        });
      }
      
      logger.debug(`[useVendor] Fetched ${productCount} products for vendor_id: ${id}`, {
        productIds: productsResult.data?.map((p: any) => p.id) || [],
        productNames: productsResult.data?.map((p: any) => p.name) || []
      });

      if (productCount === 0) {
        logger.warn(`[useVendor] No active products found for vendor_id: ${id}. Products may be inactive or not exist.`);
        if (process.env.NODE_ENV === 'development') {
          logger.warn(`[useVendor] Vendor status: ${vendorResult.data?.status}, Vendor ID: ${id}`);
        }
      }

      // Format vendor data (snake_case to camelCase)
      const v = vendorResult.data;
      const formattedVendor: Vendor = {
        id: v.id,
        name: v.name || "",
        description: v.description || "",
        image: v.image || "",
        rating: v.rating ? parseFloat(v.rating) : 0,
        deliveryTime: v.is_hyperlocal ? "30-60 mins" : "2-3 days",
        distance: v.max_delivery_radius ? `${v.max_delivery_radius} km` : "N/A",
        tags: Array.isArray(v.zones) ? v.zones : [],
        deliveryZones: {
          intracity: Array.isArray(v.zones) ? v.zones : [],
          intercity: v.intercity_enabled && v.city ? [v.city] : [],
        },
        city: v.city || "",
        isHyperlocal: v.is_hyperlocal ?? true,
        isOnline: v.is_online ?? false,
      };

      // Format products data (snake_case to camelCase) with validation
      // Swiggy Dec 2025 pattern: Validate all products, log invalid ones, never silently fail
      const formattedProducts: Product[] = (productsResult.data || [])
        .map((p: any) => {
          // Validate required fields - be more lenient with price
          // Swiggy Dec 2025 pattern: Robust price validation that handles string prices and edge cases
          // Allow price === 0 (free products) but ensure it's a valid number >= 0
          const priceValue = p.price;
          const isValidPrice = priceValue !== null && 
                               priceValue !== undefined && 
                               priceValue !== '' &&
                               !isNaN(parseFloat(String(priceValue))) &&
                               parseFloat(String(priceValue)) >= 0; // Allow 0, but must be >= 0

          if (!p.id || !p.name || !isValidPrice) {
            logger.warn("[useVendor] Invalid product data (skipping)", {
              productId: p.id,
              hasName: !!p.name,
              priceValue: priceValue,
              isValidPrice: isValidPrice,
              vendorId: id
            });
            return null;
          }
          
          // Parse dimensions if it's JSONB/object
          let dimensions = undefined;
          if (p.dimensions) {
            if (typeof p.dimensions === 'object' && !Array.isArray(p.dimensions)) {
              dimensions = {
                length: p.dimensions.length || 0,
                width: p.dimensions.width || 0,
                height: p.dimensions.height || 0,
              };
            } else if (typeof p.dimensions === 'string') {
              try {
                const parsed = JSON.parse(p.dimensions);
                dimensions = {
                  length: parsed.length || 0,
                  width: parsed.width || 0,
                  height: parsed.height || 0,
                };
              } catch {
                dimensions = undefined;
              }
            }
          }

          return {
            id: p.id,
            vendorId: p.vendor_id,
            name: p.name || "",
            description: p.description || "",
            price: parseFloat(String(priceValue)),
            image: p.image || "",
            images: Array.isArray(p.images) ? p.images : [],
            category: p.category || "",
            isPersonalizable: p.is_personalizable ?? false,
            variants: Array.isArray(p.variants) ? p.variants : [],
            addOns: Array.isArray(p.add_ons) ? p.add_ons : [],
            specs: Array.isArray(p.specs) ? p.specs : [],
            materials: Array.isArray(p.materials) ? p.materials : [],
            careInstructions: p.care_instructions || "",
            mockupSlaHours: p.mockup_sla_hours ? Number(p.mockup_sla_hours) : undefined,
            hsnCode: p.hsn_code || undefined,
            materialComposition: p.material_composition || undefined,
            dimensions: dimensions,
            weightGrams: p.weight_grams ? Number(p.weight_grams) : undefined,
            warranty: p.warranty || undefined,
            countryOfOrigin: p.country_of_origin || undefined,
            manufacturerName: p.manufacturer_name || undefined,
            manufacturerAddress: p.manufacturer_address || undefined,
          };
        })
        .filter((p): p is Product => p !== null); // Remove nulls

      // Swiggy Dec 2025 pattern: Comprehensive debug logging for formatted products
      logger.debug(`[useVendor] Formatted products:`, formattedProducts);
      logger.debug(`[useVendor] Setting products state with count:`, formattedProducts.length);
      logger.debug(`[useVendor] Formatted ${formattedProducts.length} products from ${productCount} raw products for vendor_id: ${id}`);

      setVendor(formattedVendor);
      setProducts(formattedProducts);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch vendor";
        logger.error("[useVendor] Error", err);
        setError(errorMessage);
        setVendor(null);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    });
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


