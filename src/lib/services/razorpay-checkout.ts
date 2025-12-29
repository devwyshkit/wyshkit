/**
 * Razorpay Checkout Integration (Frontend)
 * Swiggy Dec 2025 pattern: Simple, clean payment flow
 */

import { logger } from "@/lib/utils/logger";
import { env } from "@/lib/config/env";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayCheckoutOptions {
  orderId: string; // Razorpay order ID (from backend)
  amount: number; // Amount in paise
  currency?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayPaymentResponse) => void;
  onError?: (error: RazorpayError) => void;
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayError {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: {
    order_id: string;
    payment_id: string;
  };
}

/**
 * Load Razorpay script dynamically
 */
async function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if already loaded
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    // Load script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      logger.error("[Razorpay Checkout] Failed to load Razorpay script");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Get Razorpay key ID from environment
 */
function getRazorpayKeyId(): string {
  // Try multiple env var names for compatibility
  const keyId = env.RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY;
  
  if (!keyId) {
    throw new Error("Razorpay key ID not configured. Set RAZORPAY_KEY_ID or VITE_RAZORPAY_KEY.");
  }
  
  return keyId;
}

/**
 * Open Razorpay checkout
 * Swiggy Dec 2025 pattern: Simple, clean payment flow
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  try {
    // Load Razorpay script
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error("Failed to load Razorpay checkout script");
    }

    // Wait a bit for Razorpay to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!window.Razorpay) {
      throw new Error("Razorpay not available after script load");
    }

    const keyId = getRazorpayKeyId();

    // Create Razorpay instance
    const razorpay = new window.Razorpay({
      key: keyId,
      amount: options.amount,
      currency: options.currency || "INR",
      name: options.name || "WyshKit",
      description: options.description || "Order Payment",
      order_id: options.orderId,
      prefill: options.prefill || {},
      theme: options.theme || {
        color: "#000000",
      },
      handler: (response: RazorpayPaymentResponse) => {
        logger.info("[Razorpay Checkout] Payment successful", response);
        options.handler(response);
      },
      modal: {
        ondismiss: () => {
          logger.info("[Razorpay Checkout] Payment modal closed");
          if (options.onError) {
            options.onError({
              code: "USER_CLOSED",
              description: "User closed the payment modal",
              source: "user",
              step: "checkout",
              reason: "user_action",
              metadata: {
                order_id: options.orderId,
                payment_id: "",
              },
            });
          }
        },
      },
    });

    // Handle payment errors
    razorpay.on("payment.failed", (error: RazorpayError) => {
      logger.error("[Razorpay Checkout] Payment failed", error);
      if (options.onError) {
        options.onError(error);
      }
    });

    // Open checkout
    razorpay.open();
  } catch (error) {
    logger.error("[Razorpay Checkout] Failed to open checkout", error);
    if (options.onError) {
      options.onError({
        code: "CHECKOUT_ERROR",
        description: error instanceof Error ? error.message : "Failed to open payment checkout",
        source: "system",
        step: "initialization",
        reason: "system_error",
        metadata: {
          order_id: options.orderId,
          payment_id: "",
        },
      });
    }
    throw error;
  }
}

/**
 * Verify payment signature (client-side verification)
 * Note: Server-side verification is required for production
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  // Client-side verification is not secure
  // This is just a basic check - server must verify
  if (!orderId || !paymentId || !signature) {
    return false;
  }
  
  // Signature format check
  return signature.length > 0;
}


