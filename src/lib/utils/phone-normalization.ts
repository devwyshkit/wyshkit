/**
 * Phone Number Normalization Utility
 * Swiggy Dec 2025 pattern: Single source of truth for phone formatting
 * 
 * Normalizes phone numbers to E.164 format (+[country code][number])
 * Used by both send-otp and verify-otp endpoints
 */

/**
 * Normalize phone number to E.164 format
 * Ensures proper formatting before sending to Supabase/Twilio
 * 
 * @param phone - Raw phone number input (can be with/without +, with/without country code)
 * @returns Normalized phone number in E.164 format (e.g., +919740803490)
 * @throws Error if phone number cannot be normalized to valid E.164 format
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Ensure + prefix
  if (!normalized.startsWith('+')) {
    // If starts with 91, add +
    if (normalized.startsWith('91') && normalized.length === 12) {
      normalized = '+' + normalized;
    } else if (normalized.length === 10) {
      // Indian number, add +91
      normalized = '+91' + normalized;
    } else {
      // Default to +91 for Indian numbers
      normalized = '+91' + normalized;
    }
  }
  
  // Validate E.164: + followed by 10-15 digits
  if (!/^\+\d{10,15}$/.test(normalized)) {
    throw new Error(`Invalid phone number format: ${normalized}`);
  }
  
  return normalized;
}

/**
 * Mask phone number for logging (shows only last 4 digits)
 * Example: +919740803490 -> +********3490
 */
export function maskPhone(phone: string): string {
  return phone.replace(/\d(?=\d{4})/g, "*");
}




