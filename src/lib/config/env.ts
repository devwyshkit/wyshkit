/**
 * Secure environment variable management
 * Validates and provides type-safe access to environment variables
 */

import { z } from "zod";

// Environment variable schema
const envSchema = z.object({
  // Database - allow empty string or valid URL
  DATABASE_URL: z.union([
    z.string().url(),
    z.literal(""),
    z.undefined()
  ]).optional(),
  
  NEXT_PUBLIC_APP_URL: z.union([
    z.string().url(),
    z.literal(""),
    z.undefined()
  ]).optional(),
  
  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Razorpay (optional, for payment processing)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  VITE_RAZORPAY_KEY: z.string().optional(),
  RAZORPAY_SECRET: z.string().optional(),
  
  // IDfy KYC (optional, for vendor onboarding)
  VITE_IDFY_ACCOUNT_ID: z.string().optional(),
  VITE_IDFY_API_KEY: z.string().optional(),
  VITE_IDFY_BASE_URL: z.union([
    z.string().url(),
    z.literal(""),
    z.undefined()
  ]).optional(),
  
  // Google Maps/Places (optional, for location and address autocomplete)
  VITE_GOOGLE_PLACES_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(), // Public - safe for client components
  
  // Google OAuth (optional, for social login)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Nimbus Delivery (optional, for delivery service)
  NIMBUS_API_KEY: z.string().optional(),
  NIMBUS_API_URL: z.union([
    z.string().url(),
    z.literal(""),
    z.undefined()
  ]).optional(),
  NIMBUS_EMAIL: z.union([
    z.string().email(),
    z.literal(""),
    z.undefined()
  ]).optional(),
  NIMBUS_PASSWORD: z.string().optional(),
  
  // Monitoring (optional)
  SENTRY_DSN: z.union([
    z.string().url(),
    z.literal(""),
    z.undefined()
  ]).optional(),
  
  // SMS Provider (Twilio - optional, for OTP sending via Supabase)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(), // Twilio Verify Service SID for Supabase
  TWILIO_MESSAGE_SERVICE_SID: z.string().optional(), // Twilio Messaging Service SID
  TWILIO_WHATSAPP_SERVICE_SID: z.string().optional(), // Twilio WhatsApp Service SID
  TWILIO_API_KEY_SID: z.string().optional(), // Twilio API Key SID (for API access)
  
  // Email Provider (Resend - for transactional emails)
  RESEND_API_KEY: z.string().optional(),
  
  // Supabase (for Realtime, Auth, and Storage)
  NEXT_PUBLIC_SUPABASE_URL: z.union([
    z.string().url(),
    z.literal(""),
    z.undefined()
  ]).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(), // Server-side only
  
  // Feature Flags
  ENABLE_AUTH: z.coerce.boolean().default(true),
  ENABLE_RATE_LIMITING: z.coerce.boolean().default(false),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    // Normalize empty strings to undefined for optional fields
    const normalizeEnv = (value: string | undefined): string | undefined => {
      return value === "" ? undefined : value;
    };

    return envSchema.parse({
      DATABASE_URL: normalizeEnv(process.env.DATABASE_URL),
      NEXT_PUBLIC_APP_URL: normalizeEnv(process.env.NEXT_PUBLIC_APP_URL),
      NODE_ENV: process.env.NODE_ENV,
      RAZORPAY_KEY_ID: normalizeEnv(process.env.RAZORPAY_KEY_ID),
      RAZORPAY_KEY_SECRET: normalizeEnv(process.env.RAZORPAY_KEY_SECRET),
      VITE_RAZORPAY_KEY: normalizeEnv(process.env.VITE_RAZORPAY_KEY),
      RAZORPAY_SECRET: normalizeEnv(process.env.RAZORPAY_SECRET),
      VITE_IDFY_ACCOUNT_ID: normalizeEnv(process.env.VITE_IDFY_ACCOUNT_ID),
      VITE_IDFY_API_KEY: normalizeEnv(process.env.VITE_IDFY_API_KEY),
      VITE_IDFY_BASE_URL: normalizeEnv(process.env.VITE_IDFY_BASE_URL),
      VITE_GOOGLE_PLACES_API_KEY: normalizeEnv(process.env.VITE_GOOGLE_PLACES_API_KEY),
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: normalizeEnv(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
      GOOGLE_CLIENT_ID: normalizeEnv(process.env.GOOGLE_CLIENT_ID),
      GOOGLE_CLIENT_SECRET: normalizeEnv(process.env.GOOGLE_CLIENT_SECRET),
      NIMBUS_API_KEY: normalizeEnv(process.env.NIMBUS_API_KEY),
      NIMBUS_API_URL: normalizeEnv(process.env.NIMBUS_API_URL),
      NIMBUS_EMAIL: normalizeEnv(process.env.NIMBUS_EMAIL),
      NIMBUS_PASSWORD: normalizeEnv(process.env.NIMBUS_PASSWORD),
      SENTRY_DSN: normalizeEnv(process.env.SENTRY_DSN),
      TWILIO_ACCOUNT_SID: normalizeEnv(process.env.TWILIO_ACCOUNT_SID),
      TWILIO_AUTH_TOKEN: normalizeEnv(process.env.TWILIO_AUTH_TOKEN),
      TWILIO_PHONE_NUMBER: normalizeEnv(process.env.TWILIO_PHONE_NUMBER),
      RESEND_API_KEY: normalizeEnv(process.env.RESEND_API_KEY),
      NEXT_PUBLIC_SUPABASE_URL: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: normalizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ENABLE_AUTH: process.env.ENABLE_AUTH,
      ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING,
    });
  } catch (error) {
    // Always catch errors during module initialization to prevent 500 errors
    if (error instanceof z.ZodError) {
      // In development, log warnings but don't throw
      // Note: Using console here is intentional - logger may not be initialized yet
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn("[Env Config] Validation warnings:", error.issues);
      }
      
      // Swiggy Dec 2025 pattern: Preserve critical env vars even if validation fails
      // This ensures process.env values are still accessible via fallback
      const normalizeEnv = (value: string | undefined): string | undefined => {
        return value === "" ? undefined : value;
      };
      
      return {
        NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
        ENABLE_AUTH: true,
        ENABLE_RATE_LIMITING: false,
        // Preserve Supabase vars even if validation failed - fallback will use process.env
        NEXT_PUBLIC_SUPABASE_URL: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        SUPABASE_SERVICE_ROLE_KEY: normalizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
        // Preserve other critical vars
        RAZORPAY_KEY_ID: normalizeEnv(process.env.RAZORPAY_KEY_ID),
        RAZORPAY_SECRET: normalizeEnv(process.env.RAZORPAY_SECRET),
        VITE_RAZORPAY_KEY: normalizeEnv(process.env.VITE_RAZORPAY_KEY),
        TWILIO_ACCOUNT_SID: normalizeEnv(process.env.TWILIO_ACCOUNT_SID),
        TWILIO_AUTH_TOKEN: normalizeEnv(process.env.TWILIO_AUTH_TOKEN),
        TWILIO_VERIFY_SERVICE_SID: normalizeEnv(process.env.TWILIO_VERIFY_SERVICE_SID),
        RESEND_API_KEY: normalizeEnv(process.env.RESEND_API_KEY),
      } as z.infer<typeof envSchema>;
    }
    
    // For any other error, return safe defaults with process.env fallback
    // Note: Using console here is intentional - logger may not be initialized yet
    // eslint-disable-next-line no-console
    console.error("[Env Config] Error parsing environment variables:", error);
    
    const normalizeEnv = (value: string | undefined): string | undefined => {
      return value === "" ? undefined : value;
    };
    
    return {
      NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
      ENABLE_AUTH: true,
      ENABLE_RATE_LIMITING: false,
      // Preserve process.env values for fallback
      NEXT_PUBLIC_SUPABASE_URL: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: normalizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
      // Preserve other critical vars
      RAZORPAY_KEY_ID: normalizeEnv(process.env.RAZORPAY_KEY_ID),
      RAZORPAY_SECRET: normalizeEnv(process.env.RAZORPAY_SECRET),
      VITE_RAZORPAY_KEY: normalizeEnv(process.env.VITE_RAZORPAY_KEY),
      TWILIO_ACCOUNT_SID: normalizeEnv(process.env.TWILIO_ACCOUNT_SID),
      TWILIO_AUTH_TOKEN: normalizeEnv(process.env.TWILIO_AUTH_TOKEN),
      TWILIO_VERIFY_SERVICE_SID: normalizeEnv(process.env.TWILIO_VERIFY_SERVICE_SID),
      RESEND_API_KEY: normalizeEnv(process.env.RESEND_API_KEY),
    } as z.infer<typeof envSchema>;
  }
};

// Lazy initialization function - SSR-safe pattern
let _envInstance: z.infer<typeof envSchema> | null = null;
let _initializationError: Error | null = null;

function getSafeDefaults(): z.infer<typeof envSchema> {
  const normalizeEnv = (value: string | undefined): string | undefined => {
    return value === "" ? undefined : value;
  };

  return {
    NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
    ENABLE_AUTH: true,
    ENABLE_RATE_LIMITING: false,
    // Preserve critical env vars from process.env
    NEXT_PUBLIC_SUPABASE_URL: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: normalizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
    RAZORPAY_KEY_ID: normalizeEnv(process.env.RAZORPAY_KEY_ID),
    RAZORPAY_SECRET: normalizeEnv(process.env.RAZORPAY_SECRET),
    VITE_RAZORPAY_KEY: normalizeEnv(process.env.VITE_RAZORPAY_KEY),
    TWILIO_ACCOUNT_SID: normalizeEnv(process.env.TWILIO_ACCOUNT_SID),
    TWILIO_AUTH_TOKEN: normalizeEnv(process.env.TWILIO_AUTH_TOKEN),
    TWILIO_VERIFY_SERVICE_SID: normalizeEnv(process.env.TWILIO_VERIFY_SERVICE_SID),
    RESEND_API_KEY: normalizeEnv(process.env.RESEND_API_KEY),
    // Include all optional fields as undefined
    DATABASE_URL: normalizeEnv(process.env.DATABASE_URL),
    NEXT_PUBLIC_APP_URL: normalizeEnv(process.env.NEXT_PUBLIC_APP_URL),
    RAZORPAY_KEY_SECRET: normalizeEnv(process.env.RAZORPAY_KEY_SECRET),
    VITE_IDFY_ACCOUNT_ID: normalizeEnv(process.env.VITE_IDFY_ACCOUNT_ID),
    VITE_IDFY_BASE_URL: normalizeEnv(process.env.VITE_IDFY_BASE_URL),
    VITE_GOOGLE_PLACES_API_KEY: normalizeEnv(process.env.VITE_GOOGLE_PLACES_API_KEY),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: normalizeEnv(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
    GOOGLE_CLIENT_ID: normalizeEnv(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: normalizeEnv(process.env.GOOGLE_CLIENT_SECRET),
    NIMBUS_API_KEY: normalizeEnv(process.env.NIMBUS_API_KEY),
    NIMBUS_API_URL: normalizeEnv(process.env.NIMBUS_API_URL),
    NIMBUS_EMAIL: normalizeEnv(process.env.NIMBUS_EMAIL),
    NIMBUS_PASSWORD: normalizeEnv(process.env.NIMBUS_PASSWORD),
    SENTRY_DSN: normalizeEnv(process.env.SENTRY_DSN),
    TWILIO_PHONE_NUMBER: normalizeEnv(process.env.TWILIO_PHONE_NUMBER),
    TWILIO_MESSAGE_SERVICE_SID: normalizeEnv(process.env.TWILIO_MESSAGE_SERVICE_SID),
    TWILIO_WHATSAPP_SERVICE_SID: normalizeEnv(process.env.TWILIO_WHATSAPP_SERVICE_SID),
    TWILIO_API_KEY_SID: normalizeEnv(process.env.TWILIO_API_KEY_SID),
  } as z.infer<typeof envSchema>;
}

function initializeEnv(): z.infer<typeof envSchema> {
  if (_envInstance) {
    return _envInstance;
  }

  if (_initializationError) {
    // Return safe defaults if initialization previously failed
    _envInstance = getSafeDefaults();
    return _envInstance;
  }

  try {
    _envInstance = parseEnv();
    return _envInstance;
  } catch (error) {
    _initializationError = error instanceof Error ? error : new Error(String(error));
    // Note: Using console here is intentional - logger may not be initialized yet
    // eslint-disable-next-line no-console
    console.error("[Env Config] Failed to initialize environment config:", error);
    _envInstance = getSafeDefaults();
    return _envInstance;
  }
}

// Export getter that initializes on first access (lazy initialization)
// Swiggy Dec 2025 pattern: SSR-safe Proxy pattern prevents module initialization errors
export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop) {
    const instance = initializeEnv();
    return instance[prop as keyof typeof instance];
  },
});

// Type-safe environment variable access
export type Env = z.infer<typeof envSchema>;

// Helper to check if we're in production
// SSR-safe: Wrap in IIFE with try-catch to prevent module initialization errors
export const isProduction = (() => {
  try {
    return env.NODE_ENV === "production";
  } catch {
    return process.env.NODE_ENV === "production";
  }
})();

export const isDevelopment = (() => {
  try {
    return env.NODE_ENV === "development";
  } catch {
    return process.env.NODE_ENV !== "production";
  }
})();

export const isTest = (() => {
  try {
    return env.NODE_ENV === "test";
  } catch {
    return process.env.NODE_ENV === "test";
  }
})();

// Helper to get required env var (throws if missing)
export function getRequiredEnv(key: keyof Env): string {
  const value = env[key];
  if (!value || typeof value !== "string") {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

