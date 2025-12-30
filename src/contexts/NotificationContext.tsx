"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/utils/logger";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * In-app notifications context
 * Swiggy Dec 2025 pattern: Real-time notifications via Supabase Realtime
 */

interface Notification {
  id: string;
  userId?: string;
  type: "order" | "account" | "promotion";
  title: string;
  body?: string;
  message?: string;
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

  // Fetch notifications using Supabase client directly
    const fetchNotifications = useCallback(async () => {
      if (typeof window === "undefined" || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = getSupabaseClient();
        if (!supabase) {
          setNotifications([]);
          setLoading(false);
          return;
        }

        // Get user's notifications using Supabase client (RLS enforces access to own notifications)
        // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
        const { data, error: queryError } = await supabase
          .from('notifications')
          .select('id, user_id, type, title, message, read, data, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (queryError) {
          logger.error(`[NotificationContext] Failed to fetch notifications: ${queryError.message}`, { 
            code: queryError.code,
            details: queryError.details,
          });
          setNotifications([]);
          setLoading(false); // CRITICAL FIX: Always set loading to false on error
          return;
        }

        // Map Supabase response (snake_case) to camelCase
        const formattedNotifications: Notification[] = (data || []).map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          type: n.type,
          title: n.title,
          body: n.body || n.message,
          message: n.body || n.message, // Keep both for compatibility
          read: n.read,
          data: n.data,
          createdAt: n.created_at,
        }));

        setNotifications(formattedNotifications);
      } catch (error) {
        // Detailed error logging for Swiggy Dec 2025 observability
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`[NotificationContext] Failed to fetch notifications: ${errorMsg}`, error);
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

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      // Subscribe to notifications table changes for this user
      channel = supabase
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
            try {
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
                const deletedId = payload.old?.id as string;
                if (deletedId) {
                  setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
                }
              }
            } catch (payloadError) {
              logger.error("[NotificationContext] Error processing realtime payload", payloadError);
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
    } catch (error) {
      logger.error("[NotificationContext] Failed to set up Realtime subscription", error);
    }

    // Cleanup subscription on unmount
    return () => {
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch (cleanupError) {
          logger.warn("[NotificationContext] Error cleaning up Realtime subscription", cleanupError);
        }
      }
    };
  }, [user?.id]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Supabase client not available");
      }

      // Update notification using Supabase client (RLS enforces access to own notifications)
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }
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
      const supabase = getSupabaseClient();
      if (!supabase || !user?.id) {
        throw new Error("Supabase client not available");
      }

      // Update all notifications using Supabase client (RLS enforces access to own notifications)
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      logger.error("[NotificationContext] Failed to mark all as read", error);
      // Revert optimistic update on error
      fetchNotifications();
    }
  }, [fetchNotifications, user?.id]);

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

