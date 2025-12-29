/**
 * Rate limiting middleware
 * Simple in-memory rate limiter following Swiggy Dec 2025 patterns
 * 
 * NOTE: In-memory storage doesn't persist across Edge Runtime instances.
 * For production, consider using:
 * - Redis (via Upstash, Vercel KV, etc.)
 * - Vercel Edge Config
 * - A dedicated rate limiting service
 * 
 * This implementation works for single-instance deployments but may not
 * be effective in distributed/multi-instance environments.
 */

import type { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// Use a Map for better Edge Runtime compatibility
// Note: This is still in-memory and won't persist across instances
const store = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  identifier?: (request: NextRequest) => string; // Custom identifier function
}

/**
 * Get identifier for rate limiting
 * Uses IP address by default, can be customized
 */
function getIdentifier(request: NextRequest, options?: RateLimitOptions): string {
  if (options?.identifier) {
    return options.identifier(request);
  }

  // Default: Use IP address from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown';

  return ip;
}

/**
 * Clean up expired entries (simple cleanup, runs on every check)
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.resetAt < now) {
      store.delete(key);
    }
  }
}

/**
 * Rate limit check
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupExpired();

  const identifier = getIdentifier(request, options);
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired entry
    const newEntry = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    store.set(identifier, newEntry);
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  if (entry.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  store.set(identifier, entry);
  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // Strict rate limit for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
  },
  // Standard API rate limit
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  // Lenient rate limit for public endpoints
  public: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
};

