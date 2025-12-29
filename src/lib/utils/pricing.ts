/**
 * Price calculation utilities
 */

import { Product } from "@/types/product";

/**
 * Calculate item price including variants and add-ons
 * Used for cart items and order items
 */
export function calculateItemPrice(
  item: {
    price: number;
    variants?: Array<{
      id: string;
      options: Array<{ id: string; priceModifier?: number }>;
    }>;
    addOns?: Array<{ id: string; price: number }>;
    selectedVariants?: Record<string, string>;
    selectedAddOns?: string[];
  }
): number {
  // Calculate variant price modifiers
  const variantPriceModifier = item.variants?.reduce((total, variant) => {
    const selectedOptionId = item.selectedVariants?.[variant.id];
    if (!selectedOptionId) return total;
    const option = variant.options.find(o => o.id === selectedOptionId);
    return total + (option?.priceModifier || 0);
  }, 0) || 0;
  
  // Calculate add-ons price
  const addOnsPrice = item.addOns?.filter(a => item.selectedAddOns?.includes(a.id)).reduce((sum, a) => sum + a.price, 0) || 0;
  
  return item.price + variantPriceModifier + addOnsPrice;
}

/**
 * Calculate total price including variants and add-ons
 * @deprecated Use calculateItemPrice instead
 */
export function calculateProductPrice(
  basePrice: number,
  selectedVariants: Array<{ priceModifier?: number }>,
  selectedAddOns: Array<{ price: number }>
): number {
  const variantModifier = selectedVariants.reduce(
    (sum, variant) => sum + (variant.priceModifier || 0),
    0
  );
  const addOnsPrice = selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
  
  return basePrice + variantModifier + addOnsPrice;
}

/**
 * Calculate order total
 */
export function calculateOrderTotal(
  itemTotal: number,
  deliveryFee: number,
  platformFee: number = 5,
  cashbackUsed: number = 0
): number {
  return itemTotal + deliveryFee + platformFee - cashbackUsed;
}

/**
 * Calculate commission amount
 */
export function calculateCommission(orderTotal: number, commissionRate: number = 0.18): number {
  return Math.round(orderTotal * commissionRate);
}

/**
 * Format price for display (Indian Rupees)
 */
export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}



