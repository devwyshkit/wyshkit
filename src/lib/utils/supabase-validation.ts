/**
 * Supabase URL Validation Utilities
 * Swiggy Dec 2025 pattern: Comprehensive validation before connection attempts
 */

import { logger } from "./logger";

/**
 * Valid Supabase URL pattern: https://<project-id>.supabase.co
 */
const SUPABASE_URL_PATTERN = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/;

/**
 * Validate Supabase URL format
 * Returns project ID if valid, null otherwise
 */
export function validateSupabaseUrl(url: string | undefined | null): {
  valid: boolean;
  projectId?: string;
  error?: string;
} {
  if (!url || typeof url !== "string" || url.trim() === "") {
    return {
      valid: false,
      error: "Supabase URL is not set",
    };
  }

  const trimmedUrl = url.trim();
  const match = trimmedUrl.match(SUPABASE_URL_PATTERN);

  if (!match) {
    return {
      valid: false,
      error: `Invalid Supabase URL format. Expected: https://<project-id>.supabase.co, got: ${trimmedUrl}`,
    };
  }

  const projectId = match[1];
  if (!projectId || projectId.length < 10) {
    return {
      valid: false,
      error: `Invalid project ID in URL: ${projectId}`,
    };
  }

  return {
    valid: true,
    projectId,
  };
}

/**
 * Extract project ID from Supabase URL
 */
export function extractProjectId(url: string): string | null {
  const validation = validateSupabaseUrl(url);
  return validation.valid ? validation.projectId || null : null;
}

/**
 * Test DNS resolution for a hostname (server-side only)
 * Swiggy Dec 2025 pattern: Fail fast with clear diagnostics
 */
export async function testDnsResolution(hostname: string): Promise<{
  resolved: boolean;
  error?: string;
  address?: string;
}> {
  // Only run on server-side
  if (typeof window !== "undefined") {
    return {
      resolved: false,
      error: "DNS resolution test is server-side only",
    };
  }

  try {
    const dns = await import("dns/promises");
    const addresses = await dns.lookup(hostname, { family: 4 });
    
    return {
      resolved: true,
      address: Array.isArray(addresses) ? addresses[0]?.address : addresses.address,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNotFound = errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo");
    
    return {
      resolved: false,
      error: isNotFound 
        ? `DNS resolution failed: ${hostname} not found. The Supabase project may be paused, deleted, or the URL is incorrect.`
        : `DNS resolution error: ${errorMessage}`,
    };
  }
}

/**
 * Test Supabase API connectivity
 * Swiggy Dec 2025 pattern: Comprehensive connectivity check
 */
export async function testSupabaseConnectivity(
  url: string,
  anonKey: string
): Promise<{
  reachable: boolean;
  error?: string;
  statusCode?: number;
  responseTime?: number;
}> {
  const validation = validateSupabaseUrl(url);
  if (!validation.valid) {
    return {
      reachable: false,
      error: validation.error,
    };
  }

  try {
    const startTime = Date.now();
    const testUrl = `${url}/rest/v1/`;
    
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const responseTime = Date.now() - startTime;

    // Even if we get an error response, the connection worked
    return {
      reachable: true,
      statusCode: response.status,
      responseTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for specific error types
    if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
      return {
        reachable: false,
        error: `DNS resolution failed. The Supabase project URL cannot be found. Please verify your project is active in Supabase Dashboard.`,
      };
    }
    
    if (errorMessage.includes("ECONNREFUSED")) {
      return {
        reachable: false,
        error: `Connection refused. Check your internet connection and firewall settings.`,
      };
    }
    
    if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      return {
        reachable: false,
        error: `Connection timeout. The Supabase service may be slow or unreachable. Please try again.`,
      };
    }

    return {
      reachable: false,
      error: `Connection test failed: ${errorMessage}`,
    };
  }
}

/**
 * Test Supabase Auth endpoint specifically
 */
export async function testSupabaseAuthConnectivity(
  url: string,
  anonKey: string
): Promise<{
  reachable: boolean;
  error?: string;
  statusCode?: number;
}> {
  const validation = validateSupabaseUrl(url);
  if (!validation.valid) {
    return {
      reachable: false,
      error: validation.error,
    };
  }

  try {
    const testUrl = `${url}/auth/v1/health`;
    
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    return {
      reachable: true,
      statusCode: response.status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
      return {
        reachable: false,
        error: `DNS resolution failed for Auth endpoint. Verify your Supabase project is active.`,
      };
    }

    return {
      reachable: false,
      error: `Auth endpoint test failed: ${errorMessage}`,
    };
  }
}

/**
 * Comprehensive Supabase configuration validation
 * Swiggy Dec 2025 pattern: All-in-one validation with actionable diagnostics
 */
export async function validateSupabaseConfig(
  url: string | undefined,
  anonKey: string | undefined
): Promise<{
  valid: boolean;
  urlValid: boolean;
  dnsResolved: boolean;
  apiReachable: boolean;
  authReachable: boolean;
  errors: string[];
  recommendations: string[];
  details: {
    urlValidation?: ReturnType<typeof validateSupabaseUrl>;
    dnsTest?: Awaited<ReturnType<typeof testDnsResolution>>;
    apiTest?: Awaited<ReturnType<typeof testSupabaseConnectivity>>;
    authTest?: Awaited<ReturnType<typeof testSupabaseAuthConnectivity>>;
  };
}> {
  const result = {
    valid: false,
    urlValid: false,
    dnsResolved: false,
    apiReachable: false,
    authReachable: false,
    errors: [] as string[],
    recommendations: [] as string[],
    details: {} as {
      urlValidation?: ReturnType<typeof validateSupabaseUrl>;
      dnsTest?: Awaited<ReturnType<typeof testDnsResolution>>;
      apiTest?: Awaited<ReturnType<typeof testSupabaseConnectivity>>;
      authTest?: Awaited<ReturnType<typeof testSupabaseAuthConnectivity>>;
    },
  };

  // Step 1: Validate URL format
  const urlValidation = validateSupabaseUrl(url);
  result.details.urlValidation = urlValidation;
  
  if (!urlValidation.valid) {
    result.errors.push(urlValidation.error || "Invalid URL format");
    result.recommendations.push("Check your NEXT_PUBLIC_SUPABASE_URL in .env.local");
    result.recommendations.push("Expected format: https://<project-id>.supabase.co");
    return result;
  }
  
  result.urlValid = true;

  if (!anonKey || typeof anonKey !== "string" || anonKey.trim() === "") {
    result.errors.push("Supabase anon key is not set");
    result.recommendations.push("Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
    return result;
  }

  // Step 2: Test DNS resolution
  const hostname = new URL(url!).hostname;
  const dnsTest = await testDnsResolution(hostname);
  result.details.dnsTest = dnsTest;
  
  if (!dnsTest.resolved) {
    result.errors.push(dnsTest.error || "DNS resolution failed");
    result.recommendations.push("Verify your Supabase project is active in Supabase Dashboard");
    result.recommendations.push("Check if the project ID in the URL is correct");
    result.recommendations.push("If the project was paused, reactivate it in Supabase Dashboard");
    return result;
  }
  
  result.dnsResolved = true;

  // Step 3: Test API connectivity
  const apiTest = await testSupabaseConnectivity(url!, anonKey);
  result.details.apiTest = apiTest;
  
  if (!apiTest.reachable) {
    result.errors.push(apiTest.error || "API endpoint not reachable");
    result.recommendations.push("Check your internet connection");
    result.recommendations.push("Verify Supabase service status");
    return result;
  }
  
  result.apiReachable = true;

  // Step 4: Test Auth endpoint
  const authTest = await testSupabaseAuthConnectivity(url!, anonKey);
  result.details.authTest = authTest;
  
  if (!authTest.reachable) {
    result.errors.push(authTest.error || "Auth endpoint not reachable");
    result.recommendations.push("Auth endpoint connectivity issue - check Supabase Dashboard");
  } else {
    result.authReachable = true;
  }

  // Overall validation
  result.valid = result.urlValid && result.dnsResolved && result.apiReachable;

  return result;
}


