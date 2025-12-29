/**
 * Deep Linking Utilities
 * Swiggy Dec 2025 pattern: Simple, clean deep linking with URL parsing
 */

import { logger } from "@/lib/utils/logger";

export interface DeepLinkParams {
  [key: string]: string | string[] | undefined;
}

export interface ParsedDeepLink {
  path: string;
  params: DeepLinkParams;
  isValid: boolean;
}

/**
 * Parse deep link URL
 * Supports formats:
 * - /product/:id
 * - /vendor/:id
 * - /order/:id
 * - /search?q=query
 * - /?ref=code
 */
export function parseDeepLink(url: string): ParsedDeepLink {
  try {
    // Remove protocol and domain if present
    let path = url;
    if (url.includes("://")) {
      try {
        const urlObj = new URL(url);
        path = urlObj.pathname + urlObj.search;
      } catch {
        // If URL parsing fails, use as-is
        path = url;
      }
    }

    // Remove leading slash for consistency
    path = path.startsWith("/") ? path.slice(1) : path;

    // Parse query parameters
    const params: DeepLinkParams = {};
    const queryIndex = path.indexOf("?");
    let queryString = "";
    
    if (queryIndex !== -1) {
      queryString = path.slice(queryIndex + 1);
      path = path.slice(0, queryIndex);
    }

    // Parse query string
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((value, key) => {
        if (params[key]) {
          // Handle multiple values
          const existing = params[key];
          params[key] = Array.isArray(existing) 
            ? [...existing, value]
            : [existing as string, value];
        } else {
          params[key] = value;
        }
      });
    }

    return {
      path: `/${path}`,
      params,
      isValid: true,
    };
  } catch (error) {
    logger.error("[Deep Linking] Failed to parse deep link", { url, error });
    return {
      path: "/",
      params: {},
      isValid: false,
    };
  }
}

/**
 * Generate deep link URL
 * Swiggy Dec 2025 pattern: Clean, readable URLs
 */
export function generateDeepLink(
  path: string,
  params?: DeepLinkParams
): string {
  try {
    // Ensure path starts with /
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    if (!params || Object.keys(params).length === 0) {
      return cleanPath;
    }

    // Build query string
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${cleanPath}?${queryString}` : cleanPath;
  } catch (error) {
    logger.error("[Deep Linking] Failed to generate deep link", { path, params, error });
    return path;
  }
}

/**
 * Handle deep link navigation
 * Swiggy Dec 2025 pattern: Smart routing with fallbacks
 */
export function handleDeepLink(
  url: string,
  router: { push: (path: string) => void }
): boolean {
  try {
    const parsed = parseDeepLink(url);
    
    if (!parsed.isValid) {
      logger.warn("[Deep Linking] Invalid deep link", { url });
      return false;
    }

    // Generate final URL with params
    const finalUrl = generateDeepLink(parsed.path, parsed.params);
    
    // Navigate
    router.push(finalUrl);
    
    logger.debug("[Deep Linking] Navigated to deep link", { url, finalUrl });
    return true;
  } catch (error) {
    logger.error("[Deep Linking] Failed to handle deep link", { url, error });
    return false;
  }
}

/**
 * Common deep link patterns
 */
export const DeepLinkPatterns = {
  product: (id: string) => `/partner/${id}`,
  vendor: (id: string) => `/partner/${id}`,
  order: (id: string) => `/orders?orderId=${id}`,
  search: (query: string) => `/search?q=${encodeURIComponent(query)}`,
  referral: (code: string) => `/?ref=${encodeURIComponent(code)}`,
} as const;


