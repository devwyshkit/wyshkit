/**
 * Order helper utilities
 * Swiggy Dec 2025 pattern: Simple, focused utility functions
 */

/**
 * Calculate total weight of order items in kg
 * Default weight estimation: 0.5kg per item (conservative estimate for gifts)
 */
export function calculateOrderWeight(items: Array<{ quantity: number; weight?: number }>): number {
  return items.reduce((total, item) => {
    // Use provided weight or default to 0.5kg per item
    const itemWeight = item.weight || 0.5;
    return total + itemWeight * item.quantity;
  }, 0);
}

