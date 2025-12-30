"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { deduplicateRequest } from "@/lib/utils/request-dedup";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  vendorId: string;
  vendor?: {
    id: string;
    name: string;
    image?: string;
  };
  vendorName?: string; // Legacy field, prefer vendor.name
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

    // Swiggy Dec 2025 pattern: Deduplicate concurrent requests
    await deduplicateRequest('orders', async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabaseClient();
        if (!supabase) {
          setError("Service temporarily unavailable");
          setOrders([]);
          setLoading(false);
          return;
        }

        // Swiggy Dec 2025 pattern: Join vendor data to eliminate N+1 queries
        // Get user's orders with vendor data joined in single query
        // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
        const { data, error: queryError } = await supabase
          .from('orders')
          .select('id, order_number, customer_id, vendor_id, status, sub_status, items, item_total, delivery_fee, platform_fee, cashback_used, total, delivery_type, delivery_address, payment_id, payment_status, created_at, updated_at, vendors(id, name, image)')
          .order('created_at', { ascending: false });

      if (queryError) {
        setError(queryError.message || "Failed to fetch orders");
        setOrders([]);
        return;
      }

      // Map Supabase response (snake_case to camelCase) with joined vendor data
      const formattedOrders: Order[] = (data || []).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        total: parseFloat(o.total || "0"),
        vendorId: o.vendor_id,
        vendor: o.vendors ? {
          id: o.vendors.id,
          name: o.vendors.name || "",
          image: o.vendors.image || "",
        } : undefined,
        vendorName: o.vendors?.name || o.vendor_name, // Use joined vendor name if available
        items: Array.isArray(o.items) ? o.items : [],
        deliveryAddress: o.delivery_address,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      }));

        setOrders(formattedOrders);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch orders";
        setError(errorMessage);
        setOrders([]);
      } finally {
        setLoading(false);
      }