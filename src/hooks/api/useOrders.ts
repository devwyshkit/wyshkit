"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api/client";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  vendorId: string;
  vendorName?: string;
  items: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    price: number;
  }>;
  deliveryAddress?: {
    name: string;
    address: string;
    city: string;
    pincode: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UseOrdersResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOrders(): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    // Don't fetch on server-side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<{ orders: Order[] }>("/orders");

      // Validate response exists and has required properties
      if (!response || typeof response !== 'object') {
        setError("Invalid response from server");
        setOrders([]);
        return;
      }

      setOrders(Array.isArray(response.orders) ? response.orders : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch orders";
      setError(errorMessage);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
  };
}

