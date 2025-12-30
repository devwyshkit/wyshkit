/**
 * Nimbus delivery API integration
 * 
 * NOTE: This service is prepared but not currently integrated.
 * Delivery partner integration is planned for future implementation.
 * 
 * Swiggy Dec 2025 pattern: Keep code simple - only integrate when needed.
 * Currently, orders use manual delivery coordination.
 */
import { env } from "@/lib/config/env";
import { logger } from "@/lib/utils/logger";
import { appConfig } from "@/lib/config/app";
import { nimbusAuth } from "./nimbus-auth";

export interface NimbusConfig {
  apiKey: string;
  apiUrl: string;
}

export interface DeliveryRequest {
  orderId: string;
  pickupAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
  };
  deliveryAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
  };
  weight: number; // kg
  type: "local" | "intercity";
}

export class NimbusService {
  private apiUrl: string | null;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || env.NIMBUS_API_URL || null;
  }

  /**
   * Create delivery order with Nimbus
   */
  async createDelivery(request: DeliveryRequest): Promise<{
    deliveryId: string;
    partnerId: string;
    estimatedTime: string;
  }> {
    if (!this.apiUrl) {
      logger.warn("[Nimbus] API not configured, returning mock response");
      return {
        deliveryId: `mock_delivery_${request.orderId}`,
        partnerId: "mock_partner_123",
        estimatedTime: request.type === "local" 
          ? appConfig.delivery.defaultDeliveryTime 
          : "2-5 days",
      };
    }

    try {
      // Get authentication token
      const token = await nimbusAuth.getToken();

      // Create delivery order via Nimbus API
      // Adjust endpoint based on actual Nimbus API documentation
      const response = await fetch(`${this.apiUrl}/deliveries`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: request.orderId,
          pickup: request.pickupAddress,
          delivery: request.deliveryAddress,
          weight: request.weight,
          type: request.type,
        }),
      });

      if (!response.ok) {
        // If unauthorized, try refreshing token once
        if (response.status === 401) {
          logger.warn("[Nimbus] Token expired, refreshing...");
          const newToken = await nimbusAuth.refreshToken();
          
          // Retry with new token
          const retryResponse = await fetch(`${this.apiUrl}/deliveries`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${newToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: request.orderId,
              pickup: request.pickupAddress,
              delivery: request.deliveryAddress,
              weight: request.weight,
              type: request.type,
            }),
          });

          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({ message: retryResponse.statusText }));
            throw new Error(errorData.message || `Nimbus API error: ${retryResponse.statusText}`);
          }

          const retryData = await retryResponse.json();
          logger.info(`[Nimbus] Delivery created for order ${request.orderId}`, {
            deliveryId: retryData.deliveryId,
            partnerId: retryData.partnerId,
          });

          return {
            deliveryId: retryData.deliveryId,
            partnerId: retryData.partnerId,
            estimatedTime: retryData.estimatedTime || (request.type === "local" 
              ? appConfig.delivery.defaultDeliveryTime 
              : "2-5 days"),
          };
        }

        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Nimbus API error: ${response.statusText}`);
      }

      const data = await response.json();

      logger.info(`[Nimbus] Delivery created for order ${request.orderId}`, {
        deliveryId: data.deliveryId,
        partnerId: data.partnerId,
      });

      return {
        deliveryId: data.deliveryId,
        partnerId: data.partnerId,
        estimatedTime: data.estimatedTime || (request.type === "local" 
          ? appConfig.delivery.defaultDeliveryTime 
          : "2-5 days"),
      };
    } catch (error) {
      logger.error("[Nimbus] Failed to create delivery", error);
      throw error instanceof Error ? error : new Error("Failed to create delivery order");
    }
  }

  /**
   * Track delivery status
   */
  async trackDelivery(deliveryId: string): Promise<{
    status: string;
    location: { lat: number; lng: number } | null;
    estimatedArrival?: string;
  }> {
    if (!this.apiUrl) {
      logger.warn("[Nimbus] API not configured, returning mock response");
      return { status: "pending", location: null };
    }

    try {
      // Get authentication token
      const token = await nimbusAuth.getToken();

      const response = await fetch(`${this.apiUrl}/deliveries/${deliveryId}/track`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If unauthorized, try refreshing token once
        if (response.status === 401) {
          logger.warn("[Nimbus] Token expired, refreshing...");
          const newToken = await nimbusAuth.refreshToken();
          
          // Retry with new token
          const retryResponse = await fetch(`${this.apiUrl}/deliveries/${deliveryId}/track`, {
            headers: {
              "Authorization": `Bearer ${newToken}`,
            },
          });

          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({ message: retryResponse.statusText }));
            throw new Error(errorData.message || `Nimbus API error: ${retryResponse.statusText}`);
          }

          const retryData = await retryResponse.json();
          return {
            status: retryData.status,
            location: retryData.location || null,
            estimatedArrival: retryData.estimatedArrival,
          };
        }

        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Nimbus API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        status: data.status,
        location: data.location || null,
        estimatedArrival: data.estimatedArrival,
      };
    } catch (error) {
      logger.error("[Nimbus] Failed to track delivery", error);
      throw error instanceof Error ? error : new Error("Failed to track delivery");
    }
  }
}

// Export singleton instance
export const nimbusService = new NimbusService();

/**
 * Get Nimbus service instance
 * Swiggy Dec 2025 pattern: Consistent helper function pattern
 */
export function getNimbusService(): NimbusService {
  return nimbusService;
}

