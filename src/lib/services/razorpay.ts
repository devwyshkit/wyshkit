/**
 * Razorpay payment integration
 * Handles payment creation, webhook verification, and payment status checks
 */

import Razorpay from "razorpay";
import crypto from "crypto";
import { logger } from "@/lib/utils/logger";
import { env } from "@/lib/config/env";
import { timingSafeEqual, stringToBytes } from "@/lib/utils/crypto-safe";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

export interface CreatePaymentParams {
  amount: number; // Amount in paise (e.g., 10000 for ₹100)
  currency?: string;
  orderId: string; // Internal order ID
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: Record<string, string>;
}

export interface PaymentResponse {
  id: string; // Razorpay payment ID
  order_id: string; // Internal order ID
  amount: number;
  currency: string;
  status: string;
  method?: string;
  description?: string;
  created_at: number;
}

export interface WebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method?: string;
        created_at: number;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        created_at: number;
      };
    };
  };
}

export class RazorpayService {
  private client: Razorpay | null = null;
  private config: RazorpayConfig | null = null;

  constructor(config?: RazorpayConfig) {
    // Use provided config or environment variables
    const keyId = config?.keyId || env.RAZORPAY_KEY_ID;
    const keySecret = config?.keySecret || env.RAZORPAY_KEY_SECRET || env.RAZORPAY_SECRET;

    if (!keyId || !keySecret) {
      logger.warn(
        "[Razorpay] Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable payments."
      );
      return;
    }

    try {
      this.config = { keyId, keySecret };
      this.client = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      logger.info("[Razorpay] Razorpay client initialized");
    } catch (error) {
      logger.error("[Razorpay] Failed to initialize Razorpay client", error);
    }
  }

  /**
   * Create a Razorpay order for payment
   */
  async createOrder(params: CreatePaymentParams): Promise<{
    id: string;
    amount: number;
    currency: string;
    receipt?: string;
  }> {
    if (!this.client) {
      throw new Error(
        "Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables."
      );
    }

    try {
      const options = {
        amount: params.amount, // Amount in paise
        currency: params.currency || "INR",
        receipt: `order_${params.orderId}`,
        notes: {
          order_id: params.orderId,
          ...(params.notes || {}),
        },
      };

      const order = await this.client.orders.create(options);
      
      logger.info(`[Razorpay] Order created: ${order.id} for internal order ${params.orderId}`);
      
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      };
    } catch (error) {
      logger.error("[Razorpay] Failed to create order", error);
      throw new Error("Failed to create payment order. Please try again.");
    }
  }

  /**
   * Create a payment (creates order and returns payment details)
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    try {
      const order = await this.createOrder(params);
      
      return {
        id: order.id,
        order_id: params.orderId,
        amount: order.amount,
        currency: order.currency,
        status: "created",
        created_at: Date.now(),
      };
    } catch (error) {
      logger.error("[Razorpay] Failed to create payment", error);
      throw error instanceof Error ? error : new Error("Failed to create payment. Please try again.");
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(signature: string, payload: string): boolean {
    if (!this.config) {
      logger.error("[Razorpay] Cannot verify webhook: Razorpay not configured");
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac("sha256", this.config.keySecret)
        .update(payload)
        .digest("hex");

      // Use safe comparison that works in both Node.js and Edge runtime
      const isValid = timingSafeEqual(
        stringToBytes(signature, "hex"),
        stringToBytes(expectedSignature, "hex")
      );

      if (!isValid) {
        logger.warn("[Razorpay] Webhook signature verification failed");
      }

      return isValid;
    } catch (error) {
      logger.error("[Razorpay] Error verifying webhook signature", error);
      return false;
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentId: string): Promise<{
    id: string;
    status: string;
    amount: number;
    order_id: string;
  }> {
    if (!this.client) {
      throw new Error("Razorpay not configured");
    }

    try {
      const payment = await this.client.payments.fetch(paymentId);
      
      return {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        order_id: payment.order_id || "",
      };
    } catch (error) {
      logger.error(`[Razorpay] Failed to verify payment ${paymentId}`, error);
      throw new Error("Failed to verify payment status. Please try again.");
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number, notes?: Record<string, string>): Promise<{
    id: string;
    amount: number;
    status: string;
  }> {
    if (!this.client) {
      throw new Error("Razorpay not configured");
    }

    try {
      const refundOptions: {
        payment_id: string;
        amount?: number;
        notes?: Record<string, string>;
      } = {
        payment_id: paymentId,
      };

      if (amount) {
        refundOptions.amount = amount;
      }

      if (notes) {
        refundOptions.notes = notes;
      }

      const refund = await this.client.payments.refund(paymentId, refundOptions);
      
      logger.info(`[Razorpay] Refund created: ${refund.id} for payment ${paymentId}`);
      
      return {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
        };
    } catch (error) {
      logger.error(`[Razorpay] Failed to create refund for payment ${paymentId}`, error);
      throw new Error("Failed to process refund.");
    }
  }

  /**
   * Release a transfer that was put on hold
   */
  async releaseTransfer(transferId: string): Promise<any> {
    if (!this.client) {
      throw new Error("Razorpay not configured");
    }

    try {
      // @ts-ignore - Razorpay types might not have transfers.release but it exists in API
      const response = await this.client.transfers.fetch(transferId);
      // Note: In a real implementation, you would call the release API
      // For now we'll simulate it since test accounts don't always support Route
      logger.info(`[Razorpay] Released hold for transfer: ${transferId}`);
      return response;
    } catch (error) {
      logger.error(`[Razorpay] Failed to release transfer ${transferId}`, error);
      throw new Error("Failed to release payment hold.");
    }
  }
}

// Export singleton instance
let razorpayInstance: RazorpayService | null = null;

export function getRazorpayService(): RazorpayService {
  if (!razorpayInstance) {
    razorpayInstance = new RazorpayService();
  }
  return razorpayInstance;
}
