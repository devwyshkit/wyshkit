"use client";

import { useEffect, useState } from "react";
import { subscribeToOrder } from "@/lib/realtime/subscriptions";

interface OrderUpdate {
  orderId: string;
  status: string;
  subStatus?: string;
  updatedAt: string;
}

export type ConnectionMode = "realtime" | "polling";

/**
 * Hook to subscribe to real-time order updates
 * Tracks actual connection state and mode (realtime vs polling)
 */
export function useOrderUpdates(orderId: string | null) {
  const [orderUpdate, setOrderUpdate] = useState<OrderUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("realtime");

  useEffect(() => {
    if (!orderId) {
      setIsConnected(false);
      setConnectionMode("realtime");
      return;
    }

    const unsubscribe = subscribeToOrder(
      orderId,
      (payload) => {
        setOrderUpdate(payload);
      },
      (connected, mode) => {
        setIsConnected(connected);
        setConnectionMode(mode);
      }
    );

    return () => {
      unsubscribe();
      setIsConnected(false);
      setConnectionMode("realtime");
    };
  }, [orderId]);

  return {
    orderUpdate,
    isConnected,
    connectionMode,
  };
}



