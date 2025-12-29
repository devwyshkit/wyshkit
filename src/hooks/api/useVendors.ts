"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import type { Vendor } from "@/types/vendor";
import type { VendorQueryInput } from "@/lib/validations/vendors";

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

  const fetchVendors = useCallback(async () => {
    // Don't fetch on server-side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query?.city) params.set("city", query.city);
      if (query?.zone) params.set("zone", query.zone);
      if (query?.status) params.set("status", query.status);
      if (query?.limit) params.set("limit", query.limit.toString());
      if (query?.offset) params.set("offset", query.offset.toString());
      if (query?.search) params.set("search", query.search);
      if (query?.sortBy) params.set("sortBy", query.sortBy);
      if (query?.sortOrder) params.set("sortOrder", query.sortOrder);
      if (query?.lat !== undefined) params.set("lat", query.lat.toString());
      if (query?.lng !== undefined) params.set("lng", query.lng.toString());

      const response = await apiClient.get<{ vendors: Vendor[] }>(
        `/vendors${params.toString() ? `?${params.toString()}` : ""}`
      );

      // Validate response exists and has required properties
      if (!response || typeof response !== 'object') {
        setError("Invalid response from server");
        setVendors([]);
        return;
      }

      setVendors(Array.isArray(response.vendors) ? response.vendors : []);
      
      // Don't show error if we got empty array from 503 (expected when DB unavailable)
      // The UI will show empty state instead
      if (Array.isArray(response.vendors) && response.vendors.length === 0 && (response as { _devMode?: boolean })._devMode) {
        // Using mock data in development - no error needed
        setError(null);
      }
    } catch (err) {
      // Only show error if it's not a 503 with empty array (handled by API client)
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch vendors";
      // Don't show error for expected 503 responses - empty state is better UX
      if (errorMessage.includes("Service temporarily unavailable") || errorMessage.includes("503")) {
        setError(null);
        setVendors([]);
      } else {
        setError(errorMessage);
        setVendors([]);
      }
    } finally {
      setLoading(false);
    }
  }, [query?.city, query?.zone, query?.status, query?.limit, query?.offset, query?.search, query?.sortBy, query?.sortOrder, query?.lat, query?.lng]);

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


