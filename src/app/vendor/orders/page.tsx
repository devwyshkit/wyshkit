"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ApiError } from "@/components/errors/ApiError";
import { useToast } from "@/hooks/useToast";

interface VendorOrder {
  id: string;
  orderNumber: string;
  status: string;
  subStatus?: string;
  total: number;
  itemTotal: number;
  deliveryFee: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  deliveryAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Vendor Orders Page
 * Swiggy Dec 2025 pattern: Clean order management with status filters
 */
function VendorOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(
    searchParams.get("filter") || "all"
  );

  useEffect(() => {
    if (!user || user.role !== "vendor") {
      router.push("/");
      return;
    }

    fetchOrders();
  }, [user, router, filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("filter", filter);
      }

      const data = await apiClient.get<VendorOrder[]>(`/vendor/orders?${params.toString()}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-500">Delivered</Badge>;
      case "out_for_delivery":
        return <Badge className="bg-blue-500">Out for Delivery</Badge>;
      case "crafting":
        return <Badge className="bg-purple-500">Crafting</Badge>;
      case "mockup_ready":
        return <Badge className="bg-yellow-500">Mockup Ready</Badge>;
      case "personalizing":
        return <Badge className="bg-orange-500">Personalizing</Badge>;
      case "pending":
        return <Badge className="bg-gray-500">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <ApiError message={error} onRetry={fetchOrders} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage your orders</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filter === "today" ? "default" : "outline"}
            onClick={() => setFilter("today")}
            size="sm"
          >
            Today
          </Button>
          <Button
            variant={filter === "pending-mockup" ? "default" : "outline"}
            onClick={() => setFilter("pending-mockup")}
            size="sm"
          >
            Pending Mockup
          </Button>
          <Button
            variant={filter === "crafting" ? "default" : "outline"}
            onClick={() => setFilter("crafting")}
            size="sm"
          >
            Crafting
          </Button>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No orders found</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card
                key={order.id}
                onClick={() => router.push(`/vendor/orders/${order.id}`)}
                className="cursor-pointer"
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">Order #{order.orderNumber}</h3>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          {order.items.length} item{order.items.length !== 1 ? "s" : ""} • ₹
                          {order.total.toLocaleString("en-IN")}
                        </p>
                        <p>
                          {order.deliveryAddress.name} • {order.deliveryAddress.city}
                        </p>
                        <p className="text-xs">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/vendor/orders/${order.id}`);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendorOrders() {
  return (
    <ProtectedRoute requiredRole="vendor">
      <ErrorBoundary>
        <VendorOrdersContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

