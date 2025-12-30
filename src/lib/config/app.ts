/**
 * Application configuration
 * Centralized config for app-wide settings
 */

export const appConfig = {
  // App metadata
  name: "WyshKit",
  description: "Thoughtful, Artisan-Crafted Personalized Gifts",
  version: "1.0.0",

  // Platform fees
  platformFee: 5, // Fixed platform fee in INR
  commissionRate: 0.18, // 18% commission rate

  // Cashback settings (10% flat, no cap, no expiry)
  cashback: {
    rate: 0.10, // 10% of order value (flat, no capping)
    minOrderValue: 500, // Minimum order value to use cashback
    maxUsagePercent: 0.5, // Can use up to 50% of order value
    // No expiry - cashback never expires
  },

  // Delivery settings
  delivery: {
    local: {
      standard: 49,
      express: 149,
    },
    intercity: {
      standard: 99,
      express: 199,
    },
    defaultDeliveryTime: "40 min", // Default delivery time display
  },

  // Order settings
  order: {
    acceptDeadlineMinutes: 5, // Vendor has 5 minutes to accept/reject
    mockupSlaHours: 2, // Vendor has 2 hours to upload mockup
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // File upload limits and validation
  uploads: {
    productImage: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    },
    mockupImage: {
      maxSize: 10 * 1024 * 1024, // 10MB (higher for mockups)
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    },
    vendorDocument: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
    },
  },
} as const;

export type AppConfig = typeof appConfig;

