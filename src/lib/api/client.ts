/**
 * API Client with interceptors and error handling
 * Provides centralized API communication with retry logic and error handling
 */

import { logger } from "@/lib/utils/logger";

type RequestConfig = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
};

type ApiError = {
  message: string;
  status: number;
  details?: unknown;
};

class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;

  constructor(baseURL: string = "/api", timeout: number = 10000, retries: number = 2) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
    this.defaultRetries = retries;
  }

  /**
   * Supabase Auth uses cookies for authentication, not Bearer tokens.
   * Cookies are automatically sent with fetch requests, so we don't need
   * to add an Authorization header. API routes will read the session from cookies.
   * Swiggy Dec 2025 pattern: Cookie-based auth via Supabase
   */
  private async getAuthToken(): Promise<string | null> {
    // Supabase uses cookies for authentication
    // Cookies are automatically included in fetch requests
    // No need to add Authorization header
    return null;
  }

  /**
   * Create a timeout promise that rejects after specified ms
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Execute request with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    return Promise.race([
      fetch(url, options),
      this.createTimeout(timeout),
    ]) as Promise<Response>;
  }

  /**
   * Retry logic for failed requests
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }

      // Don't retry on client errors (4xx) except 429 (rate limit)
      // Also don't retry on 503 (Service Unavailable) - it's expected when DB is unavailable
      if (error instanceof ApiClientError && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      if (error instanceof ApiClientError && error.status === 503) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff
      return this.retryRequest(fn, retries - 1, delay * 2);
    }
  }

  /**
   * Handle response errors
   */
  private async handleResponse(response: Response): Promise<Response> {
    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }

      throw new ApiClientError(
        (errorData as { error?: string })?.error || response.statusText || "Request failed",
        response.status,
        errorData
      );
    }

    return response;
  }

  /**
   * Make API request
   */
  async request<T = unknown>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const {
      method = "GET",
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
    } = config;

    const url = `${this.baseURL}${endpoint}`;

    // Supabase Auth uses cookies for authentication
    // Cookies are automatically included in fetch requests
    // No need to add Authorization header
    // Swiggy Dec 2025 pattern: Cookie-based auth via Supabase
    const authHeaders: Record<string, string> = {};

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...headers,
      },
    };

    // Add body for non-GET requests
    if (body && method !== "GET") {
      requestOptions.body = JSON.stringify(body);
    }

    // Execute request with retry logic
    const executeRequest = async (): Promise<T> => {
      const response = await this.fetchWithTimeout(url, requestOptions, timeout);
      
      // Handle 503 responses gracefully - they may include data (e.g., empty arrays)
      if (response.status === 503) {
        try {
          const text = await response.text();
          if (text && text.trim() !== '') {
            const data = JSON.parse(text);
            // If response includes data (like vendors: [] or products: []), return it
            // This allows hooks to handle empty arrays gracefully
            if (data && (data.vendors || data.products || data.orders || data.addresses)) {
              return data as T;
            }
          }
        } catch {
          // If parsing fails, fall through to error handling
        }
      }
      
      const handledResponse = await this.handleResponse(response);
      
      // Handle empty responses
      const text = await handledResponse.text();
      if (!text || text.trim() === '') {
        // Return null instead of empty object to indicate no data
        // This allows hooks to properly validate responses
        return null as unknown as T;
      }

      return JSON.parse(text) as T;
    };

    try {
      return await this.retryRequest(executeRequest, retries);
    } catch (error) {
      if (error instanceof ApiClientError) {
        // Handle 401 - let components handle redirect
        // Swiggy Dec 2025 pattern: Components handle auth redirects, not API client
        // Components using this client should check for 401 and redirect appropriately
        if (error.status === 401 && typeof window !== "undefined") {
          // Don't redirect here - let the calling component handle it
          // This prevents unwanted redirects in API client
          logger.warn("[API Client] 401 Unauthorized - component should handle redirect");
        }
        // Swiggy Dec 2025 pattern: Don't suppress errors - let them propagate for proper handling
        throw error;
      }

      // Network or other errors
      throw new ApiClientError(
        error instanceof Error ? error.message : "Network error",
        0,
        error
      );
    }
  }

  /**
   * Convenience methods
   */
  get<T = unknown>(endpoint: string, config?: Omit<RequestConfig, "method" | "body">): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  post<T = unknown>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, "method" | "body">): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "POST", body });
  }

  put<T = unknown>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, "method" | "body">): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "PUT", body });
  }

  patch<T = unknown>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, "method" | "body">): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "PATCH", body });
  }

  delete<T = unknown>(endpoint: string, config?: Omit<RequestConfig, "method" | "body">): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiError, RequestConfig };
export { ApiClientError };

