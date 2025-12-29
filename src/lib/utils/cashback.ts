/**
 * Cashback calculation
 * Swiggy-style cashback system
 */

import { appConfig } from "@/lib/config/app";
import { logger } from "@/lib/utils/logger";

/**
 * Calculate cashback earned from an order
 * 10% flat rate, no capping
 */
export function calculateCashback(orderValue: number): number {
  return Math.round(orderValue * appConfig.cashback.rate);
}

/**
 * Calculate maximum cashback that can be used for an order
 */
export function calculateMaxCashbackUsage(orderValue: number, availableCashback: number): number {
  const maxUsage = Math.round(orderValue * appConfig.cashback.maxUsagePercent);
  return Math.min(maxUsage, availableCashback);
}

/**
 * Get cashback percentage for an order (with overrides)
 * NOTE: This function uses fetch() and should only be called from client-side code
 * For server-side usage, call the API route directly
 */
export async function getCashbackPercentage(categoryId?: string, vendorId?: string): Promise<number> {
  // Only run in browser environment
  if (typeof window === "undefined") {
    return appConfig.cashback.rate;
  }

  try {
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    if (vendorId) params.set("vendorId", vendorId);

    const response = await fetch(`/api/cashback/config?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      return data.percentage || appConfig.cashback.rate;
    }
  } catch (error) {
    logger.error("[Cashback] Failed to fetch config", error);
  }
  return appConfig.cashback.rate;
}

/**
 * Check if order is eligible for cashback usage
 */
export function isEligibleForCashback(orderValue: number): boolean {
  return orderValue >= appConfig.cashback.minOrderValue;
}

/**
 * Cashback has no expiry - removed expiry calculation
 * Cashback remains in wallet indefinitely until used
 */

