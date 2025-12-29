// In-app notifications service
// Swiggy Dec 2025 pattern: In-app notifications only, no browser notifications
// Email notifications (order confirmations, etc.) are handled by Resend service

import { logger } from "@/lib/utils/logger";
import { playNewOrderSound } from "./sound";
import { emailService } from "./email";

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean>;
}

export class NotificationService {
  /**
   * Send in-app notification to user
   * Swiggy Dec 2025 pattern: In-app only, no browser notifications
   * Notifications are handled by NotificationContext and toast (sonner)
   */
  async sendPushNotification(userId: string, payload: NotificationPayload): Promise<{ success: boolean }> {
    // Log notification for debugging
    logger.debug("[Notifications] In-app notification", { userId, payload });

    // In-app notifications are handled by:
    // 1. NotificationContext - for persistent notifications (badge count)
    // 2. Toast (sonner) - for temporary notifications
    // This service just logs - actual display is handled by UI components

    return { success: true };
  }

  /**
   * Notify vendor about new order
   */
  async notifyVendorNewOrder(vendorId: string, orderId: string): Promise<{ success: boolean }> {
    // Play sound for vendor (if in vendor portal)
    if (typeof window !== "undefined") {
      playNewOrderSound();
    }

    return this.sendPushNotification(vendorId, {
      title: "New Order",
      body: `Order #${orderId} - Action required`,
      data: { orderId, type: "new_order" },
    });
  }

  /**
   * Notify customer that mockup is ready
   */
  async notifyCustomerMockupReady(customerId: string, orderId: string): Promise<{ success: boolean }> {
    return this.sendPushNotification(customerId, {
      title: "Mockup Ready",
      body: `Your order #${orderId} mockup is ready for review`,
      data: { orderId, type: "mockup_ready" },
    });
  }

  /**
   * Notify customer about order status update
   */
  async notifyOrderStatusUpdate(
    customerId: string,
    orderId: string,
    status: string
  ): Promise<{ success: boolean }> {
    const statusMessages: Record<string, { title: string; body: string }> = {
      shipped: {
        title: "Order Shipped",
        body: `Your order #${orderId} is on the way!`,
      },
      delivered: {
        title: "Order Delivered",
        body: `Your order #${orderId} has been delivered. Enjoy!`,
      },
      ready_for_pickup: {
        title: "Ready for Pickup",
        body: `Your order #${orderId} is ready for pickup.`,
      },
    };

    const message = statusMessages[status] || {
      title: "Order Update",
      body: `Your order #${orderId} status has been updated.`,
    };

    return this.sendPushNotification(customerId, {
      ...message,
      data: { orderId, type: "order_update", status },
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

