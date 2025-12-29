/**
 * Feature flags
 * Control feature availability based on environment or user segments
 * SSR-safe: Uses lazy initialization to prevent module load errors
 */

import { env } from "./env";

function getFeatureFlags() {
  try {
    return {
      // Enable/disable features
      enableAuth: env.ENABLE_AUTH,
      enableRateLimiting: env.ENABLE_RATE_LIMITING,
      
      // Feature toggles
      enableCashback: true,
      enableIntercityDelivery: true,
      enableMockupReview: true,
      enableRealTimeUpdates: true,
      
      // Experimental features
      enableGiftConcierge: false,
      enableWishlist: false,
      enableSubscription: false,
    } as const;
  } catch {
    // Safe defaults if env module fails to initialize
    return {
      enableAuth: true,
      enableRateLimiting: false,
      enableCashback: true,
      enableIntercityDelivery: true,
      enableMockupReview: true,
      enableRealTimeUpdates: true,
      enableGiftConcierge: false,
      enableWishlist: false,
      enableSubscription: false,
    } as const;
  }
}

// Use Proxy pattern for lazy initialization (SSR-safe)
export const featureFlags = new Proxy({} as ReturnType<typeof getFeatureFlags>, {
  get(_target, prop) {
    const flags = getFeatureFlags();
    return flags[prop as keyof typeof flags];
  },
});

export type FeatureFlags = typeof featureFlags;

// Helper to check if feature is enabled
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags[feature] === true;
}



