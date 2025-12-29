/**
 * Generate order number in WK12345 format
 * Swiggy-style order numbering
 */

let orderCounter = 12345; // Starting counter

/**
 * Generate unique order number
 */
export function generateOrderNumber(): string {
  const number = orderCounter++;
  return `WK${number}`;
}

/**
 * Parse order number to get numeric ID
 */
export function parseOrderNumber(orderNumber: string): number | null {
  const match = orderNumber.match(/^WK(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Validate order number format
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  return /^WK\d+$/.test(orderNumber);
}




