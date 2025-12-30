/**
 * Request Deduplication Utility
 * Swiggy Dec 2025 pattern: Simple, no over-engineering
 * Prevents duplicate concurrent API requests by tracking in-flight requests
 */

// Map to track in-flight requests by cache key
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Generate a deterministic cache key from prefix and params
 * Swiggy Dec 2025 pattern: Simple serialization, no complex hashing
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  // Sort keys to ensure deterministic output
  const sortedKeys = Object.keys(params).sort();
  const serializedParams = sortedKeys
    .map((key) => {
      const value = params[key];
      // Handle different value types
      if (value === null || value === undefined) {
        return `${key}:null`;
      }
      if (typeof value === 'object') {
        // For objects/arrays, use JSON.stringify (deterministic for simple objects)
        try {
          return `${key}:${JSON.stringify(value)}`;
        } catch {
          // Fallback for circular references or non-serializable objects
          return `${key}:${String(value)}`;
        }
      }
      return `${key}:${String(value)}`;
    })
    .join('|');

  return `${prefix}:${serializedParams}`;
}

/**
 * Deduplicate concurrent requests with the same key
 * If a request with the same key is already in-flight, returns the existing promise
 * Otherwise, executes the function and tracks it
 * 
 * Swiggy Dec 2025 pattern: Client-side only, simple Map-based tracking
 */
export async function deduplicateRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  // Client-side only - skip on server
  if (typeof window === 'undefined') {
    return fn();
  }

  // Check if request is already in-flight
  const existingRequest = inFlightRequests.get(key);
  if (existingRequest) {
    // Return existing promise (will resolve/reject when original request completes)
    return existingRequest as Promise<T>;
  }

  // Create new request promise
  const requestPromise = (async () => {
    try {
      const result = await fn();
      return result;
    } finally {
      // Remove from tracking map when done (success or failure)
      inFlightRequests.delete(key);
    }
  })();

  // Track the request
  inFlightRequests.set(key, requestPromise);

  return requestPromise;
}

