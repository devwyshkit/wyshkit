"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Package, Search, Filter, AlertCircle, Clock, 
  MessageSquare, ChevronRight, Store, Calendar
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ApiError } from "@/components/errors/ApiError";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AdminOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  vendorId: string;
  vendorName: string;
  status: string;
  subStatus?: string;
  total: number;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  mockupSla?: string;
  isSlaBreached: boolean;
  hasDispute: boolean;
}

/**
 * Admin Orders Page
 * Swiggy Dec 2025 pattern: Exception-based management with SLA & Dispute focus
 */
function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/");
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchOrders();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [user, router, statusFilter, search]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (search) {
        params.set("search", search);
      }

      const response = await apiClient.get<{ orders: AdminOrder[]; total: number }>(
        `/admin/orders?${params.toString()}`
      );
      setOrders(response.orders || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      delivered: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      cancelled: "bg-red-100 text-red-700",
      personalizing: "bg-blue-100 text-blue-700",
      mockup_ready: "bg-purple-100 text-purple-700",
      crafting: "bg-indigo-100 text-indigo-700",
    };
    return (
      <Badge className={cn("border-none capitalize", variants[status] || "bg-slate-100 text-slate-700")}>
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Orders</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{total} Orders Total</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => fetchOrders()}>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Order # or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-none shadow-sm h-11 rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] bg-white border-none shadow-sm h-11 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="personalizing">Mockup</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-slate-200" />
            <p className="text-muted-foreground font-medium">No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Card 
                key={order.id} 
                className={cn(
                  "border-none shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl overflow-hidden",
                  order.isSlaBreached && "ring-1 ring-red-500",
                  order.hasDispute && "ring-1 ring-orange-500"
                )}
                onClick={() => router.push(`/admin/orders/${order.id}`)}
              >
                <CardContent className="p-0">
                  <div className="p-4 space-y-3">
                    {/* Top Row: Order # and Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">#{order.orderNumber}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <span className="font-black text-sm">₹{order.total.toLocaleString()}</span>
                    </div>

                    {/* Middle Row: Vendor and Date */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        <span className="font-bold">{order.vendorName || "Unknown Vendor"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Exceptions Row: SLA or Dispute */}
                    {(order.isSlaBreached || order.hasDispute) && (
                      <div className="flex gap-2 pt-1">
                        {order.isSlaBreached && (
                          <div className="bg-red-50 text-red-600 px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-black uppercase">
                            <AlertCircle className="w-3 h-3" />
                            SLA Breach: Mockup Overdue
                          </div>
                        )}
                        {order.hasDispute && (
                          <div className="bg-orange-50 text-orange-600 px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-black uppercase">
                            <MessageSquare className="w-3 h-3" />
                            Active Dispute
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Bottom Action Area */}
                  <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[10px] text-muted-foreground font-medium">Customer ID: {order.customerId.slice(0,8)}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ErrorBoundary>
        <AdminOrdersContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
