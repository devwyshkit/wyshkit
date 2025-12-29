"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import type { Vendor } from "@/types/vendor";
import type { Product } from "@/types/product";
import type { SearchQueryInput } from "@/lib/validations/search";

interface SearchResults {
  vendors: Vendor[];
  products: Product[];
}

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

      // Search both vendors and products
      const [vendorsResponse, productsResponse] = await Promise.all([
        apiClient.get<{ vendors: Vendor[] }>(`/vendors?search=${encodeURIComponent(searchTerm.trim())}`).catch(() => ({ vendors: [] })),
        apiClient.get<{ products: Product[] }>(`/products?search=${encodeURIComponent(searchTerm.trim())}`).catch(() => ({ products: [] })),
      ]);

      // Validate responses
      const safeVendorsResponse = vendorsResponse && typeof vendorsResponse === 'object' ? vendorsResponse : { vendors: [] };
      const safeProductsResponse = productsResponse && typeof productsResponse === 'object' ? productsResponse : { products: [] };

      setVendors(Array.isArray(safeVendorsResponse.vendors) ? safeVendorsResponse.vendors : []);
      setProducts(Array.isArray(safeProductsResponse.products) ? safeProductsResponse.products : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to search";
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


