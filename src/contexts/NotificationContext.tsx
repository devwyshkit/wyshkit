"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/utils/logger";
import { apiClient } from "@/lib/api/client";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * In-app notifications context
 * Swiggy Dec 2025 pattern: Real-time notifications via Supabase Realtime
 */

interface Notification {
  id: string;
  type: "order" | "account" | "promotion";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  orderNotificationCount: number;
  accountNotificationCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  // useAuth is already SSR-safe (marked as "use client"), but ensure we handle it properly
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate notification counts
  const unreadCount = notifications.filter(n => !n.read).length;
  const orderNotificationCount = notifications.filter(n => !n.read && n.type === "order").length;
  const accountNotificationCount = notifications.filter(n => !n.read && n.type === "account").length;

  // Fetch notifications from API
    const fetchNotifications = useCallback(async () => {
      if (typeof window === "undefined" || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await apiClient.get<{ notifications: Notification[] }>("/notifications");
        
        if (response && Array.isArray(response.notifications)) {
          setNotifications(response.notifications);
        } else {
          setNotifications([]);
        }
      } catch (error) {
        // Detailed error logging for Swiggy Dec 2025 observability
        const errorMsg = error instanceof Error ? error.message : String(error);
        const status = (error as any)?.status;
        logger.error(`[NotificationContext] Failed to fetch notifications: ${errorMsg}`, { status });
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Set up Supabase Realtime subscription for real-time updates
  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;

    const supabase = getSupabaseClient();
    if (!supabase) {
      logger.warn("[NotificationContext] Supabase client not available for Realtime");
      return;
    }

    // Subscribe to notifications table changes for this user
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.debug("[NotificationContext] Realtime update received", payload);

          if (payload.eventType === "INSERT") {
            // New notification
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            // Notification updated (e.g., marked as read)
            const updatedNotification = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
            );
          } else if (payload.eventType === "DELETE") {
            // Notification deleted
            const deletedId = payload.old.id as string;
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          logger.debug("[NotificationContext] Realtime subscription active");
        } else if (status === "CHANNEL_ERROR") {
          logger.error("[NotificationContext] Realtime subscription error");
        }
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      await apiClient.patch("/notifications", { notificationId: id });
    } catch (error) {
      logger.error("[NotificationContext] Failed to mark notification as read", error);
      // Revert optimistic update on error
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await apiClient.patch("/notifications", { markAllAsRead: true });
    } catch (error) {
      logger.error("[NotificationContext] Failed to mark all as read", error);
      // Revert optimistic update on error
      fetchNotifications();
    }
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        orderNotificationCount,
        accountNotificationCount,
        loading,
        markAsRead,
        markAllAsRead,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

