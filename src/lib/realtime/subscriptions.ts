/**
 * Supabase Realtime subscriptions
 * Handles real-time updates for orders, notifications, etc.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Exponential backoff retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
    RETRY_CONFIG.maxDelay
  );
  return delay;
}

/**
 * Polling fallback for order updates
 * Used when Supabase Realtime is unavailable
 */
function startPollingFallback(
  orderId: string,
  callback: (payload: {
    orderId: string;
    status: string;
    subStatus?: string;
    updatedAt: string;
  }) => void,
  pollInterval: number = 5000
): () => void {
  logger.warn(`[Realtime] Starting polling fallback for order ${orderId}`);
  let lastStatus: string | null = null;
  
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const order = await response.json();
        // Only call callback if status changed
        if (order.status !== lastStatus) {
          callback({
            orderId: order.id || orderId,
            status: order.status || "pending",
            subStatus: order.subStatus,
            updatedAt: order.updatedAt || new Date().toISOString(),
          });
          lastStatus = order.status;
        }
      }
    } catch (error) {
      logger.error("[Realtime] Polling error", error);
    }
  }, pollInterval);

  return () => {
    clearInterval(interval);
    logger.debug(`[Realtime] Stopped polling fallback for order ${orderId}`);
  };
}

/**
 * Polling fallback for vendor orders
 */
function startVendorOrdersPolling(
  vendorId: string,
  callback: (payload: {
    orderId: string;
    status: string;
    action: "new" | "update" | "delete";
  }) => void,
  pollInterval: number = 10000
): () => void {
  logger.warn(`[Realtime] Starting polling fallback for vendor ${vendorId} orders`);
  const seenOrderIds = new Set<string>();
  
  const interval = setInterval(async () => {
    try {
      // Swiggy Dec 2025 pattern: Use direct Supabase calls instead of API route
      // This maximizes Supabase usage and avoids unnecessary API hops
      const supabase = getSupabaseClient();
      if (!supabase) {
        logger.error("[Realtime] Supabase client not available for polling");
        return;
      }

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, status")
        .eq("vendor_id", vendorId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("[Realtime] Polling error", error);
        return;
      }

      if (Array.isArray(orders)) {
        orders.forEach((order: { id: string; status: string }) => {
          if (!seenOrderIds.has(order.id)) {
            seenOrderIds.add(order.id);
            callback({
              orderId: order.id,
              status: order.status,
              action: "new",
            });
          }
        });
      }
    } catch (error) {
      logger.error("[Realtime] Polling error", error);
    }
  }, pollInterval);

  return () => {
    clearInterval(interval);
    seenOrderIds.clear();
    logger.debug(`[Realtime] Stopped polling fallback for vendor ${vendorId} orders`);
  };
}

/**
 * Subscribe to order updates
 * Returns unsubscribe function and connection state setter
 */
export function subscribeToOrder(
  orderId: string,
  callback: (payload: {
    orderId: string;
    status: string;
    subStatus?: string;
    updatedAt: string;
  }) => void,
  onConnectionStateChange?: (connected: boolean, mode: "realtime" | "polling") => void
): () => void {
  const client = getSupabaseClient();
  
  if (!client) {
    logger.warn("[Realtime] Supabase not configured, using polling fallback");
    onConnectionStateChange?.(true, "polling");
    return startPollingFallback(orderId, callback);
  }

  try {
    // Subscribe to order changes via Supabase Realtime
    const channel = client
      .channel(`order:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          try {
            // Supabase Realtime returns database column names (snake_case)
            // Map to TypeScript camelCase for consistency
            const newRecord = payload.new as {
              id: string;
              status: string;
              sub_status?: string; // Maps to subStatus in TypeScript
              updated_at: string; // Maps to updatedAt in TypeScript
            };
            
            callback({
              orderId: newRecord.id,
              status: newRecord.status,
              subStatus: newRecord.sub_status,
              updatedAt: newRecord.updated_at,
            });
          } catch (callbackError) {
            logger.error(`[Realtime] Error in callback for order ${orderId}`, callbackError);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          logger.debug(`[Realtime] Subscribed to order ${orderId}`);
          onConnectionStateChange?.(true, "realtime");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          logger.error(`[Realtime] Subscription failed for order ${orderId} (status: ${status}). Realtime may not be enabled in Supabase. Check Supabase dashboard > Database > Replication.`);
          // Attempt retry with exponential backoff before falling back to polling
          // The retry logic will handle this via attemptResubscribe
          logger.warn(`[Realtime] Will attempt retry for order ${orderId}`);
        } else {
          logger.debug(`[Realtime] Subscription status for order ${orderId}: ${status}`);
        }
      });

    // Track subscription state to handle fallback and retries
    let subscriptionActive = true;
    let pollingUnsubscribe: (() => void) | null = null;
    let retryAttempt = 0;
    let retryTimeout: NodeJS.Timeout | null = null;

    /**
     * Attempt to resubscribe with exponential backoff
     */
    const attemptResubscribe = () => {
      if (retryAttempt >= RETRY_CONFIG.maxRetries) {
        logger.error(`[Realtime] Max retries reached for order ${orderId}, falling back to polling`);
        subscriptionActive = false;
        try {
          client.removeChannel(channel);
        } catch (cleanupError) {
          // Swiggy Dec 2025 pattern: Check if error is browser extension related
          const isBrowserExtensionError = cleanupError instanceof Error && 
            (cleanupError.message.toLowerCase().includes("runtime.lasterror") ||
             cleanupError.message.toLowerCase().includes("message port closed"));
          
          if (isBrowserExtensionError) {
            // Browser extension errors are harmless - log in development only
            if (process.env.NODE_ENV === 'development') {
              logger.debug("[Realtime] Browser extension error during cleanup (suppressed)", cleanupError);
            }
          } else {
            // Log legitimate cleanup errors
            if (process.env.NODE_ENV === 'development') {
              logger.debug("[Realtime] Cleanup error (non-critical)", cleanupError);
            }
          }
        }
        pollingUnsubscribe = startPollingFallback(orderId, callback);
        onConnectionStateChange?.(true, "polling");
        return;
      }

      const delay = calculateRetryDelay(retryAttempt);
      logger.debug(`[Realtime] Retrying subscription for order ${orderId} (attempt ${retryAttempt + 1}/${RETRY_CONFIG.maxRetries}) in ${delay}ms`);
      
      retryTimeout = setTimeout(() => {
        retryAttempt++;
        try {
          // Try to resubscribe
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              logger.info(`[Realtime] Successfully resubscribed to order ${orderId} after ${retryAttempt} retries`);
              retryAttempt = 0; // Reset retry counter on success
              onConnectionStateChange?.(true, "realtime");
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              // Retry again
              attemptResubscribe();
            }
          });
        } catch (resubscribeError) {
          logger.error(`[Realtime] Resubscribe attempt failed for order ${orderId}`, resubscribeError);
          attemptResubscribe();
        }
      }, delay);
    };

    // Check subscription status after a short delay
    const statusCheckTimeout = setTimeout(() => {
      // If subscription didn't succeed, try retry or fallback to polling
      if (subscriptionActive) {
        // Check if channel is actually subscribed
        // If not, attempt retry with exponential backoff
        try {
          const channelState = (channel as any).state;
          if (channelState !== "joined" && channelState !== "joining") {
            logger.warn(`[Realtime] Channel not joined for order ${orderId}, attempting retry`);
            attemptResubscribe();
          }
        } catch (checkError) {
          // If we can't check state, attempt retry
          logger.warn(`[Realtime] Cannot verify subscription state for order ${orderId}, attempting retry`);
          attemptResubscribe();
        }
      }
    }, 3000); // Check after 3 seconds

    return () => {
      clearTimeout(statusCheckTimeout);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      subscriptionActive = false;
      onConnectionStateChange?.(false, "realtime");
      
      if (pollingUnsubscribe) {
        pollingUnsubscribe();
      } else {
        try {
          client.removeChannel(channel);
          logger.debug(`[Realtime] Unsubscribed from order ${orderId}`);
        } catch (error) {
          // Swiggy Dec 2025 pattern: Check if error is browser extension related
          const isBrowserExtensionError = error instanceof Error && 
            (error.message.toLowerCase().includes("runtime.lasterror") ||
             error.message.toLowerCase().includes("message port closed"));
          
          if (isBrowserExtensionError) {
            // Browser extension errors are harmless - log in development only
            if (process.env.NODE_ENV === 'development') {
              logger.debug(`[Realtime] Browser extension error during cleanup (suppressed)`, error);
            }
          } else {
            logger.error(`[Realtime] Error unsubscribing from order ${orderId}`, error);
          }
        }
      }
    };
  } catch (error) {
    logger.error(`[Realtime] Failed to subscribe to order ${orderId}`, error);
    // Fallback to polling on subscription failure
    logger.warn(`[Realtime] Falling back to polling for order ${orderId} due to subscription error`);
    onConnectionStateChange?.(true, "polling");
    return startPollingFallback(orderId, callback);
  }
}

/**
 * Subscribe to vendor orders (for vendor dashboard)
 */
export function subscribeToVendorOrders(
  vendorId: string,
  callback: (payload: {
    orderId: string;
    status: string;
    action: "new" | "update" | "delete";
  }) => void
): () => void {
  const client = getSupabaseClient();
  
  if (!client) {
    logger.warn("[Realtime] Supabase not configured, using polling fallback");
    return startVendorOrdersPolling(vendorId, callback);
  }

  try {
    // Subscribe to all order changes for this vendor
    const channel = client
      .channel(`vendor:${vendorId}:orders`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "orders",
          // Note: Supabase Realtime uses database column names (snake_case)
          // vendor_id matches the database schema column name
          filter: `vendor_id=eq.${vendorId}`,
        },
        (payload) => {
          const record = (payload.new || payload.old) as {
            id: string;
            status: string;
          };
          
          let action: "new" | "update" | "delete" = "update";
          if (payload.eventType === "INSERT") {
            action = "new";
          } else if (payload.eventType === "DELETE") {
            action = "delete";
          }

          callback({
            orderId: record.id,
            status: record.status || "pending",
            action,
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          logger.debug(`[Realtime] Subscribed to vendor ${vendorId} orders`);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          logger.error(`[Realtime] Subscription failed for vendor ${vendorId} orders (status: ${status}). Realtime may not be enabled in Supabase. Check Supabase dashboard > Database > Replication.`);
          // Actually fallback to polling on channel error/timeout/closed
          logger.warn(`[Realtime] Falling back to polling for vendor ${vendorId} orders`);
          try {
            client.removeChannel(channel);
          } catch (cleanupError) {
            // Swiggy Dec 2025 pattern: Check if error is browser extension related
            const isBrowserExtensionError = cleanupError instanceof Error && 
              (cleanupError.message.toLowerCase().includes("runtime.lasterror") ||
               cleanupError.message.toLowerCase().includes("message port closed"));
            
            if (isBrowserExtensionError) {
              // Browser extension errors are harmless - log in development only
              if (process.env.NODE_ENV === 'development') {
                logger.debug("[Realtime] Browser extension error during cleanup (suppressed)", cleanupError);
              }
            } else {
              // Log legitimate cleanup errors
              if (process.env.NODE_ENV === 'development') {
                logger.debug("[Realtime] Cleanup error (non-critical)", cleanupError);
              }
            }
          }
          // Switch to polling - this will be handled by the return function
        } else {
          logger.debug(`[Realtime] Subscription status for vendor ${vendorId} orders: ${status}`);
        }
      });

    // Track subscription state to handle fallback
    let subscriptionActive = true;
    let pollingUnsubscribe: (() => void) | null = null;

    // Check subscription status after a short delay
    const statusCheckTimeout = setTimeout(() => {
      // If subscription didn't succeed, fallback to polling
      if (subscriptionActive) {
        // Check if channel is actually subscribed
        // If not, start polling fallback
        try {
          const channelState = (channel as any).state;
          if (channelState !== "joined" && channelState !== "joining") {
            logger.warn(`[Realtime] Channel not joined for vendor ${vendorId} orders, falling back to polling`);
            subscriptionActive = false;
            try {
              client.removeChannel(channel);
            } catch (cleanupError) {
              // Swiggy Dec 2025 pattern: Check if error is browser extension related
              const isBrowserExtensionError = cleanupError instanceof Error && 
                (cleanupError.message.toLowerCase().includes("runtime.lasterror") ||
                 cleanupError.message.toLowerCase().includes("message port closed"));
              
              if (isBrowserExtensionError) {
                // Browser extension errors are harmless - log in development only
                if (process.env.NODE_ENV === 'development') {
                  logger.debug("[Realtime] Browser extension error during cleanup (suppressed)", cleanupError);
                }
              } else {
                // Log legitimate cleanup errors
                if (process.env.NODE_ENV === 'development') {
                  logger.debug("[Realtime] Cleanup error (non-critical)", cleanupError);
                }
              }
            }
            pollingUnsubscribe = startVendorOrdersPolling(vendorId, callback);
          }
        } catch (checkError) {
          // If we can't check state, assume it failed and fallback
          logger.warn(`[Realtime] Cannot verify subscription state for vendor ${vendorId} orders, falling back to polling`);
          subscriptionActive = false;
          try {
            client.removeChannel(channel);
          } catch (cleanupError) {
            // Swiggy Dec 2025 pattern: Check if error is browser extension related
            const isBrowserExtensionError = cleanupError instanceof Error && 
              (cleanupError.message.toLowerCase().includes("runtime.lasterror") ||
               cleanupError.message.toLowerCase().includes("message port closed"));
            
            if (isBrowserExtensionError) {
              // Browser extension errors are harmless - log in development only
              if (process.env.NODE_ENV === 'development') {
                logger.debug("[Realtime] Browser extension error during cleanup (suppressed)", cleanupError);
              }
            } else {
              // Log legitimate cleanup errors
              if (process.env.NODE_ENV === 'development') {
                logger.debug("[Realtime] Cleanup error (non-critical)", cleanupError);
              }
            }
          }
          pollingUnsubscribe = startVendorOrdersPolling(vendorId, callback);
        }
      }
    }, 3000); // Check after 3 seconds

    return () => {
      clearTimeout(statusCheckTimeout);
      subscriptionActive = false;
      
      if (pollingUnsubscribe) {
        pollingUnsubscribe();
      } else {
        try {
          client.removeChannel(channel);
          logger.debug(`[Realtime] Unsubscribed from vendor ${vendorId} orders`);
        } catch (error) {
          // Swiggy Dec 2025 pattern: Check if error is browser extension related
          const isBrowserExtensionError = error instanceof Error && 
            (error.message.toLowerCase().includes("runtime.lasterror") ||
             error.message.toLowerCase().includes("message port closed"));
          
          if (isBrowserExtensionError) {
            // Browser extension errors are harmless - log in development only
            if (process.env.NODE_ENV === 'development') {
              logger.debug(`[Realtime] Browser extension error during cleanup (suppressed)`, error);
            }
          } else {
            logger.error(`[Realtime] Error unsubscribing from vendor ${vendorId} orders`, error);
          }
        }
      }
    };
  } catch (error) {
    logger.error(`[Realtime] Failed to subscribe to vendor ${vendorId} orders`, error);
    // Fallback to polling on subscription failure
    logger.warn(`[Realtime] Falling back to polling for vendor ${vendorId} orders due to subscription error`);
    return startVendorOrdersPolling(vendorId, callback);
  }
}

/**
 * Subscribe to user notifications
 * Listens for new notifications for a specific user
 */
export function subscribeToNotifications(
  userId: string,
  callback: (payload: {
    notificationId: string;
    userId: string;
    title: string;
    body: string;
    type: string;
    data?: Record<string, unknown>;
    read: boolean;
    createdAt: string;
  }) => void
): () => void {
  const client = getSupabaseClient();
  
  if (!client) {
    logger.warn("[Realtime] Supabase not configured, using polling fallback for notifications");
    // Fallback to polling if Supabase not configured
    let lastNotificationId: string | null = null;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/notifications?userId=${userId}&unread=true`);
        if (response.ok) {
          const { notifications } = await response.json();
          if (Array.isArray(notifications) && notifications.length > 0) {
            // Get the most recent notification
            const latest = notifications[0];
            if (latest.id !== lastNotificationId) {
              callback({
                notificationId: latest.id,
                userId: latest.userId,
                title: latest.title,
                body: latest.body,
                type: latest.type || "general",
                data: latest.data,
                read: latest.read || false,
                createdAt: latest.createdAt || new Date().toISOString(),
              });
              lastNotificationId = latest.id;
            }
          }
        }
      } catch (error) {
        logger.error("[Realtime] Notification polling error", error);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }

  try {
    // Subscribe to notification changes via Supabase Realtime
    // Note: This assumes a 'notifications' table exists with columns:
    // id, user_id, title, body, type, data (jsonb), read, created_at
    const channel = client
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          // Supabase Realtime uses database column names (snake_case)
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          try {
            // Supabase Realtime returns database column names (snake_case)
            const newRecord = payload.new as {
              id: string;
              user_id: string;
              title: string;
              body: string;
              type?: string;
              data?: Record<string, unknown>;
              read: boolean;
              created_at: string;
            };
            
            callback({
              notificationId: newRecord.id,
              userId: newRecord.user_id,
              title: newRecord.title,
              body: newRecord.body,
              type: newRecord.type || "general",
              data: newRecord.data,
              read: newRecord.read || false,
              createdAt: newRecord.created_at,
            });
          } catch (callbackError) {
            logger.error(`[Realtime] Error in notification callback for user ${userId}`, callbackError);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          logger.debug(`[Realtime] Subscribed to notifications for user ${userId}`);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          logger.error(`[Realtime] Subscription failed for user ${userId} notifications (status: ${status}). Realtime may not be enabled in Supabase. Check Supabase dashboard > Database > Replication.`);
          logger.warn(`[Realtime] Falling back to polling for user ${userId} notifications`);
        try {
          client.removeChannel(channel);
        } catch (cleanupError) {
          // Swiggy Dec 2025 pattern: Check if error is browser extension related
          const isBrowserExtensionError = cleanupError instanceof Error && 
            (cleanupError.message.toLowerCase().includes("runtime.lasterror") ||
             cleanupError.message.toLowerCase().includes("message port closed"));
          
          if (isBrowserExtensionError) {
            // Browser extension errors are harmless - log in development only
            if (process.env.NODE_ENV === 'development') {
              logger.debug("[Realtime] Browser extension error during cleanup (suppressed)", cleanupError);
            }
          } else {
            // Log legitimate cleanup errors
            if (process.env.NODE_ENV === 'development') {
              logger.debug("[Realtime] Cleanup error (non-critical)", cleanupError);
            }
          }
        }
        } else {
          logger.debug(`[Realtime] Subscription status for user ${userId} notifications: ${status}`);
        }
      });

    // Track subscription state to handle fallback
    let subscriptionActive = true;
    let pollingUnsubscribe: (() => void) | null = null;

    // Check subscription status after a short delay
    const statusCheckTimeout = setTimeout(() => {
      if (subscriptionActive) {
        try {
          const channelState = (channel as any).state;
          if (channelState !== "joined" && channelState !== "joining") {
            logger.warn(`[Realtime] Channel not joined for user ${userId} notifications, falling back to polling`);
            subscriptionActive = false;
        try {
          client.removeChannel(channel);
        } catch (cleanupError) {
          // Swiggy Dec 2025 pattern: Check if error is browser extension related
          const isBrowserExtensionError = cleanupError instanceof Error && 
            (cleanupError.message.toLowerCase().includes("runtime.lasterror") ||
             cleanupError.message.toLowerCase().includes("message port closed"));
          
          if (isBrowserExtensionError) {
            // Browser extension errors are harmless - log in development only
            if (process.env.NODE_ENV === 'development') {
              logger.debug("[Realtime] Browser extension error during cleanup (suppressed)", cleanupError);
            }
          } else {
            // Log legitimate cleanup errors
            if (process.env.NODE_ENV === 'development') {
              logger.debug("[Realtime] Cleanup error (non-critical)", cleanupError);
            }
          }
        }
            // Start polling fallback
            let lastNotificationId: string | null = null;
            const interval = setInterval(async () => {
              try {
                const response = await fetch(`/api/notifications?userId=${userId}&unread=true`);
                if (response.ok) {
                  const { notifications } = await response.json();
                  if (Array.isArray(notifications) && notifications.length > 0) {
                    const latest = notifications[0];
                    if (latest.id !== lastNotificationId) {
                      callback({
                        notificationId: latest.id,
                        userId: latest.userId,
                        title: latest.title,
                        body: latest.body,
                        type: latest.type || "general",
                        data: latest.data,
                        read: latest.read || false,
                        createdAt: latest.createdAt || new Date().toISOString(),
                      });
                      lastNotificationId = latest.id;
                    }
                  }
                }
              } catch (error) {
                logger.error("[Realtime] Notification polling error", error);
              }
            }, 10000);
            pollingUnsubscribe = () => clearInterval(interval);
          }
        } catch (checkError) {
          logger.warn(`[Realtime] Cannot verify subscription state for user ${userId} notifications, falling back to polling`);
          subscriptionActive = false;
        try {
          client.removeChannel(channel);
        } catch (cleanupError) {
          // Swiggy Dec 2025 pattern: Check if error is browser extension related
          const isBrowserExtensionError = cleanupError instanceof Error && 
            (cleanupError.message.toLowerCase().includes("runtime.lasterror") ||
             cleanupError.message.toLowerCase().includes("message port closed"));
          
          if (isBrowserExtensionError) {
            // Browser extension errors are harmless - log in development only
            if (process.env.NODE_ENV === 'development') {
              logger.debug("[Realtime] Browser extension error during cleanup (suppressed)", cleanupError);
            }
          } else {
            // Log legitimate cleanup errors
            if (process.env.NODE_ENV === 'development') {
              logger.debug("[Realtime] Cleanup error (non-critical)", cleanupError);
            }
          }
        }
          // Start polling fallback
          let lastNotificationId: string | null = null;
          const interval = setInterval(async () => {
            try {
              const response = await fetch(`/api/notifications?userId=${userId}&unread=true`);
              if (response.ok) {
                const { notifications } = await response.json();
                if (Array.isArray(notifications) && notifications.length > 0) {
                  const latest = notifications[0];
                  if (latest.id !== lastNotificationId) {
                    callback({
                      notificationId: latest.id,
                      userId: latest.userId,
                      title: latest.title,
                      body: latest.body,
                      type: latest.type || "general",
                      data: latest.data,
                      read: latest.read || false,
                      createdAt: latest.createdAt || new Date().toISOString(),
                    });
                    lastNotificationId = latest.id;
                  }
                }
              }
            } catch (error) {
              logger.error("[Realtime] Notification polling error", error);
            }
          }, 10000);
          pollingUnsubscribe = () => clearInterval(interval);
        }
      }
    }, 3000);

    return () => {
      clearTimeout(statusCheckTimeout);
      subscriptionActive = false;
      
      if (pollingUnsubscribe) {
        pollingUnsubscribe();
      } else {
        try {
          client.removeChannel(channel);
          logger.debug(`[Realtime] Unsubscribed from notifications for user ${userId}`);
        } catch (error) {
          // Swiggy Dec 2025 pattern: Check if error is browser extension related
          const isBrowserExtensionError = error instanceof Error && 
            (error.message.toLowerCase().includes("runtime.lasterror") ||
             error.message.toLowerCase().includes("message port closed"));
          
          if (isBrowserExtensionError) {
            // Browser extension errors are harmless - log in development only
            if (process.env.NODE_ENV === 'development') {
              logger.debug(`[Realtime] Browser extension error during cleanup (suppressed)`, error);
            }
          } else {
            logger.error(`[Realtime] Error unsubscribing from notifications for user ${userId}`, error);
          }
        }
      }
    };
  } catch (error) {
    logger.error(`[Realtime] Failed to subscribe to notifications for user ${userId}`, error);
    // Fallback to polling on subscription failure
    logger.warn(`[Realtime] Falling back to polling for user ${userId} notifications due to subscription error`);
    // Start polling fallback
    let lastNotificationId: string | null = null;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/notifications?userId=${userId}&unread=true`);
        if (response.ok) {
          const { notifications } = await response.json();
          if (Array.isArray(notifications) && notifications.length > 0) {
            const latest = notifications[0];
            if (latest.id !== lastNotificationId) {
              callback({
                notificationId: latest.id,
                userId: latest.userId,
                title: latest.title,
                body: latest.body,
                type: latest.type || "general",
                data: latest.data,
                read: latest.read || false,
                createdAt: latest.createdAt || new Date().toISOString(),
              });
              lastNotificationId = latest.id;
            }
          }
        }
      } catch (error) {
        logger.error("[Realtime] Notification polling error", error);
      }
    }, 10000);
    return () => clearInterval(interval);
  }
}
