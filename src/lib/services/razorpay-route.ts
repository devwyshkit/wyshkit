/**
 * Razorpay Route - Payment split logic
 * Handles automatic split: WyshKit commission (18%) + Vendor payment (82%)
 * Uses Razorpay Route API for automatic payment splitting
 */

import { appConfig } from "@/lib/config/app";
import { logger } from "@/lib/utils/logger";
import { getRazorpayService } from "./razorpay";
import { env, isDevelopment } from "@/lib/config/env";
import { encodeBase64 } from "@/lib/utils/base64";

export interface PaymentSplitConfig {
  orderId: string;
  paymentId: string; // Razorpay payment ID
  totalAmount: number; // Amount in paise
  commissionRate?: number; // Defaults to app config
  vendorAccountId: string; // Razorpay Route account ID (from vendor.razorpayAccountId)
}

export interface PaymentSplitResult {
  wyshkitAmount: number;
  vendorAmount: number;
  razorpayRouteId: string;
  status: "created" | "processed" | "failed";
}

export interface ReleasePaymentResult {
  success: boolean;
  routeId: string;
  releasedAmount: number;
}

export class RazorpayRouteService {
  private razorpayService = getRazorpayService();

  /**
   * Split payment using Razorpay Route
   * Automatically splits payment between WyshKit (commission) and Vendor
   */
  async splitPayment(config: PaymentSplitConfig): Promise<PaymentSplitResult> {
    const commissionRate = config.commissionRate ?? appConfig.commissionRate;
    const commissionDecimal = commissionRate / 100;
    
    // Calculate amounts in paise
    const wyshkitAmount = Math.round(config.totalAmount * commissionDecimal);
    const vendorAmount = config.totalAmount - wyshkitAmount;

    // Check if Razorpay is configured
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      if (isDevelopment) {
        logger.warn("[Razorpay Route] Development mode: Razorpay not configured, returning mock split result");
        return {
          wyshkitAmount: Math.round(config.totalAmount * commissionDecimal),
          vendorAmount: config.totalAmount - Math.round(config.totalAmount * commissionDecimal),
          razorpayRouteId: `mock_route_${config.paymentId}`,
          status: "created" as const,
        };
      }
      logger.error("[Razorpay Route] Razorpay not configured, cannot split payment");
      throw new Error(
        "Payment splitting not available. Please configure Razorpay credentials."
      );
    }

    // Validate vendor account ID
    if (!config.vendorAccountId) {
      logger.error("[Razorpay Route] Vendor account ID not provided");
      throw new Error("Vendor payment account not configured.");
    }

    try {
      // Razorpay Route API call
      // Note: Razorpay Route requires the payment to be captured first
      // This should be called after payment is successful
      
      const routeUrl = `https://api.razorpay.com/v1/payments/${config.paymentId}/transfer`;
      
      const transfers = [
        {
          account: config.vendorAccountId,
          amount: vendorAmount,
          currency: "INR",
          notes: {
            order_id: config.orderId,
            type: "vendor_payment",
            description: `Payment for order ${config.orderId}`,
          },
        },
        // WyshKit commission stays in main account (no transfer needed)
        // If you have a separate WyshKit account, add it here
      ];

      const response = await fetch(routeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${encodeBase64(
            `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
          )}`,
        },
        body: JSON.stringify({
          transfers: transfers,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[Razorpay Route] Split payment failed: ${response.status} ${errorText}`);
        throw new Error("Failed to split payment. Please contact support.");
      }

      const result = await response.json();
      
      // Razorpay Route returns an array of transfers
      const routeId = result.id || result.transfers?.[0]?.id || `route_${config.orderId}`;
      
      logger.info(
        `[Razorpay Route] Payment split successful for order ${config.orderId}. ` +
        `WyshKit: ₹${(wyshkitAmount / 100).toFixed(2)}, Vendor: ₹${(vendorAmount / 100).toFixed(2)}`
      );

      return {
        wyshkitAmount,
        vendorAmount,
        razorpayRouteId: routeId,
        status: "created",
      };
    } catch (error) {
      logger.error("[Razorpay Route] Failed to split payment", error);
      
      // Return calculated amounts even if API call fails
      // The payment can be manually split later
      return {
        wyshkitAmount,
        vendorAmount,
        razorpayRouteId: `failed_${config.orderId}`,
        status: "failed",
      };
    }
  }

  /**
   * Release vendor payment (after delivery confirmation)
   * This is typically used for escrow scenarios, but Razorpay Route
   * automatically transfers to vendor account, so this is mainly for logging
   */
  async releaseVendorPayment(routeId: string, orderId: string): Promise<ReleasePaymentResult> {
    try {
      // With Razorpay Route, payment is automatically transferred
      // This function is mainly for logging and status updates
      
      logger.info(`[Razorpay Route] Payment released for route ${routeId}, order ${orderId}`);
      
      return {
        success: true,
        routeId,
        releasedAmount: 0, // Amount already transferred via Route
      };
    } catch (error) {
      logger.error(`[Razorpay Route] Failed to release payment for route ${routeId}`, error);
      throw new Error("Failed to release vendor payment. Please contact support.");
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(routeId: string): Promise<{
    id: string;
    status: string;
    amount: number;
  }> {
    try {
      const response = await fetch(`https://api.razorpay.com/v1/transfers/${routeId}`, {
        method: "GET",
        headers: {
          "Authorization": `Basic ${encodeBase64(
            `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
          )}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transfer status: ${response.status}`);
      }

      const transfer = await response.json();
      
      return {
        id: transfer.id,
        status: transfer.status,
        amount: transfer.amount,
      };
    } catch (error) {
      logger.error(`[Razorpay Route] Failed to get transfer status for ${routeId}`, error);
      throw new Error("Failed to check payment status. Please try again.");
    }
  }
}

// Export singleton instance
let razorpayRouteInstance: RazorpayRouteService | null = null;

export function getRazorpayRouteService(): RazorpayRouteService {
  if (!razorpayRouteInstance) {
    razorpayRouteInstance = new RazorpayRouteService();
  }
  return razorpayRouteInstance;
}
