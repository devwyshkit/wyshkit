"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, Clock, DollarSign, TrendingUp, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ApiError } from "@/components/errors/ApiError";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/vendor/CountdownTimer";

interface VendorDashboardStats {
  vendorId?: string;
  todayOrders: number;
  pendingMockups: number;
  totalEarnings: number;
  pendingEarnings: number;
  ordersThisMonth: number;
  averageRating: number;
  pendingAcceptanceCount: number;
  pendingOrders?: Array<{ id: string; createdAt: string }>;
  activeOrders: any[];
}

/**
 * Vendor Dashboard
 * Swiggy Dec 2025 pattern: Mobile-first dashboard with key metrics
 */
function VendorDashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<VendorDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sound Alert logic
  useEffect(() => {
    if (stats?.pendingAcceptanceCount && stats.pendingAcceptanceCount > 0) {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audio.play().catch(() => {
        // Autoplay might be blocked, ignore
      });
    }
  }, [stats?.pendingAcceptanceCount]);

  useEffect(() => {
    if (!user || user.role !== "vendor") {
      router.push("/");
      return;
    }

    fetchDashboardStats();
  }, [user, router]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<VendorDashboardStats & { onboardingStatus?: string }>("/vendor/dashboard");
      
      // Redirect to onboarding if not approved
      if (data.onboardingStatus && data.onboardingStatus !== "approved") {
        router.push("/vendor/onboarding");
        return;
      }
      
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
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
          <ApiError message={error} onRetry={fetchDashboardStats} />
        </div>
      </div>
    );
  }

  if (!stats) return null;

    const statCards = [
      {
        title: "Today's Orders",
        value: stats.todayOrders.toString(),
        icon: Package,
        href: "/vendor/orders?filter=today",
        color: "text-blue-600",
      },
      {
        title: "New Orders",
        value: stats.pendingAcceptanceCount.toString(),
        icon: AlertCircle,
        href: "/vendor/orders?filter=pending",
        color: "text-red-600",
        highlight: stats.pendingAcceptanceCount > 0,
      },
      {
        title: "Pending Mockups",
        value: stats.pendingMockups.toString(),
        icon: Clock,
        href: "/vendor/orders?filter=pending-mockup",
        color: "text-yellow-600",
        highlight: stats.pendingMockups > 0,
      },
      {
        title: "Total Earnings",
        value: `₹${stats.totalEarnings.toLocaleString("en-IN")}`,
        icon: DollarSign,
        href: "/vendor/earnings",
        color: "text-green-600",
      },
    ];


  return (
    <div className="min-h-screen bg-background p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Partner Dashboard</h1>
              <p className="text-muted-foreground mt-1">Welcome back, {user?.name || "Partner"}</p>
            </div>
            {stats.onboardingStatus === "approved" && stats.vendorId && (
              <Link href={`/partner/${stats.vendorId}`} target="_blank">
                <Button variant="outline" className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View Public Shop
                </Button>
              </Link>
            )}
          </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className={stat.highlight ? "border-yellow-500" : ""}
                onClick={() => router.push(stat.href)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

          {/* Action Needed Section */}
          {(stats.pendingAcceptanceCount > 0 || stats.pendingMockups > 0) && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                Action Needed
              </h2>
              <div className="grid gap-4">
                {stats.pendingAcceptanceCount > 0 && (
                  <Card 
                    className="border-red-200 bg-red-50/50 cursor-pointer hover:bg-red-50 transition-colors"
                    onClick={() => router.push("/vendor/orders?filter=pending")}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Package className="w-5 h-5 text-red-600" />
                        </div>
                          <div>
                            <p className="font-bold text-red-900">{stats.pendingAcceptanceCount} New Orders</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-red-700">Accept within:</p>
                              {stats.pendingOrders?.[0] && (
                                <CountdownTimer 
                                  deadline={new Date(new Date(stats.pendingOrders[0].createdAt).getTime() + 5 * 60 * 1000)} 
                                  className="h-5 px-1.5 text-[10px]"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push("/vendor/orders?filter=pending");
                            }}
                          >
                            Accept Now
                          </Button>
                          <Badge variant="destructive" className="ml-auto">Urgent</Badge>
                        </div>
                      </CardContent>
                  </Card>
                )}
                {stats.pendingMockups > 0 && (
                  <Card 
                    className="border-yellow-200 bg-yellow-50/50 cursor-pointer hover:bg-yellow-50 transition-colors"
                    onClick={() => router.push("/vendor/orders?filter=pending-mockup")}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-bold text-yellow-900">{stats.pendingMockups} Mockups Pending</p>
                          <p className="text-xs text-yellow-700">Upload mockups for customer approval</p>
                        </div>
                      </div>
                      <Badge className="bg-yellow-500 hover:bg-yellow-600">Action</Badge>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* ... existing card ... */}
          </div>

          {/* Active Orders List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active Orders</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push("/vendor/orders")}>
                View All
              </Button>
            </div>
            {stats.activeOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No active orders at the moment
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {stats.activeOrders.map((order: any) => (
                  <Card 
                    key={order.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => router.push(`/vendor/orders/${order.id}`)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold">Order #{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">
                            {order.status.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">₹{Number(order.total).toLocaleString()}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>


        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Orders This Month</span>
              <span className="text-lg font-semibold">{stats.ordersThisMonth}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average Rating</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{stats.averageRating.toFixed(1)}</span>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VendorDashboard() {
  return (
    <ProtectedRoute requiredRole="vendor">
      <ErrorBoundary>
        <VendorDashboardContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

