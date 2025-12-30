/**
 * Supabase Storage Configuration
 * Centralized configuration for Supabase storage URLs
 * Swiggy Dec 2025 pattern: Centralized configuration management
 */

import { env } from "./env";

/**
 * Get Supabase storage base URL
 * Swiggy Dec 2025 pattern: Graceful degradation with URL validation
 * SSR-safe: Returns null if called during SSR or if env fails
 */
export function getSupabaseStorageUrl(): string | null {
  // SSR safety: Don't access env module during SSR
  // Client-side only: env module might not be initialized during SSR
  if (typeof window === "undefined") {
    return null;
  }
  
  try {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl || typeof supabaseUrl !== "string" || supabaseUrl.trim() === "") {
      return null;
    }
    
    // Validate URL format: https://<project-id>.supabase.co
    const urlMatch = supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co\/?$/);
    if (urlMatch) {
      return supabaseUrl;
    }
    
    // Invalid URL format
    return null;
  } catch (error) {
    // Gracefully handle any errors (env module might not be initialized)
    return null;
  }
}

/**
 * Get storage bucket URL for a specific bucket
 * Returns null if Supabase URL is invalid or unavailable
 */
export function getStorageBucketUrl(bucket: string, path: string): string | null {
  const baseUrl = getSupabaseStorageUrl();
  if (!baseUrl) {
    return null;
  }
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Get storage render URL for images
 * Returns null if Supabase URL is invalid or unavailable
 */
export function getStorageRenderUrl(bucket: string, path: string): string | null {
  const baseUrl = getSupabaseStorageUrl();
  if (!baseUrl) {
    return null;
  }
  return `${baseUrl}/storage/v1/render/image/public/${bucket}/${path}`;
}

/**
 * Predefined storage paths
 */
export const SUPABASE_STORAGE_PATHS = {
  // Document uploads
  documentUploads: {
    bucket: "document-uploads",
    logo: "horizontal-no-tagline-transparent-1500x375-1767016662859.png",
  },
  // Scripts
  scripts: {
    bucket: "scripts",
    browserLogs: "orchids-browser-logs.js",
    routeMessenger: "route-messenger.js",
  },
} as const;

/**
 * Get logo URL with fallback
 * Swiggy Dec 2025 pattern: Graceful degradation with local fallback
 * SSR-safe: Returns fallback immediately if called during SSR
 */
export function getLogoUrl(): string {
  // Use the local transparent logo provided by the user
  return "/images/logo.png";
}

/**
 * Get script URL
 * SSR-safe: Returns empty string if Supabase URL not configured or invalid
 * Swiggy Dec 2025 pattern: Graceful degradation when services unavailable
 */
export function getScriptUrl(scriptName: "browserLogs" | "routeMessenger"): string {
  // Swiggy Dec 2025 pattern: Disable optional scripts until storage bucket is configured
  // These Orchids monitoring scripts are non-critical and should fail gracefully
  // Re-enable by implementing script URL generation once 'scripts' bucket exists in Supabase Storage
  return "";
}

