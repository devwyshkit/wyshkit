"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  BarChart3, Users, Package, DollarSign, Clock, TrendingUp, 
  AlertCircle, CheckCircle2, ChevronRight, Bell, Star,
  ArrowUpRight, ShoppingBag, Store
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ApiError } from "@/components/errors/ApiError";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell 
} from "recharts";

interface DashboardStats {
  totalOrders: number;
  totalVendors: number;
  totalRevenue: number;
  pendingApprovals: number;
  todayOrders: number;
  revenueGrowth: number;
  dailyOrders: Array<{ date: string; count: number }>;
  topCategories: Array<{ name: string; revenue: number; percentage: number }>;
  topVendors: Array<{ name: string; revenue: number; orders: number }>;
  operationalMetrics: {
    mockupSlaCompliance: number;
    onTimeDelivery: number;
    customerSatisfaction: number;
    repeatOrderRate: number;
  };
}

/**
 * Admin Dashboard
 * Swiggy Dec 2025 pattern: Mobile-first, exception-based, action-oriented
 */
function AdminDashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/");
      return;
    }

    fetchDashboardStats();
  }, [user, router]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<DashboardStats>("/admin/dashboard");
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <ApiError message={error} onRetry={fetchDashboardStats} />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-8">
      {/* Top Navigation / Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">WyshKit Admin</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Dec 2025 Edition</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
            {user?.name?.[0] || "A"}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        
        {/* Exception-Based Alerts */}
        {stats.pendingApprovals > 0 && (
          <div 
            className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => router.push("/admin/vendors?status=pending")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">{stats.pendingApprovals} New Vendor Applications</p>
                <p className="text-xs text-blue-700/80">Pending approval for marketplace entry</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-400" />
          </div>
        )}

        {/* Operational Snapshot */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Today's Orders</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-black">{stats.todayOrders}</span>
                <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px] border-none font-bold">
                  LIVE
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Revenue</p>
              <div className="flex items-end justify-between">
                <span className="text-xl font-black">₹{Math.round(stats.totalRevenue/1000)}k</span>
                <span className="text-[10px] font-bold text-green-600">+{stats.revenueGrowth}%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">SLA Compliance</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-black">{stats.operationalMetrics.mockupSlaCompliance}%</span>
                <div className="w-8 h-1 bg-green-500 rounded-full mb-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Active Vendors</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-black">{stats.totalVendors}</span>
                <Store className="w-4 h-4 text-muted-foreground/30 mb-1" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Chart */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold">Daily Orders</CardTitle>
              <p className="text-xs text-muted-foreground">Last 7 days performance</p>
            </div>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0 pb-4 h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyOrders} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#999' }}
                  tickFormatter={(val) => val.split('-').slice(2).join('/')}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Categories */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Top Performing Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.topCategories.map((cat, i) => (
                <div key={cat.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{i+1}. {cat.name}</span>
                    <span className="text-muted-foreground">₹{cat.revenue.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-primary/70' : 'bg-primary/40'}`} 
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-right text-muted-foreground">{cat.percentage}% of total</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Vendors */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Store className="w-4 h-4" />
                Top Performing Vendors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.topVendors.map((vendor, i) => (
                <div key={vendor.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center font-black text-xs text-slate-400">
                      {i+1}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{vendor.name}</p>
                      <p className="text-[10px] text-muted-foreground">{vendor.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black">₹{Math.round(vendor.revenue/1000)}k</p>
                    <ArrowUpRight className="w-3 h-3 text-green-500 ml-auto" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Operational Metrics */}
        <Card className="border-none shadow-sm bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-400">Operational Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">On-Time Delivery</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-green-400">{stats.operationalMetrics.onTimeDelivery}%</span>
                  <div className="px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 text-[8px] font-black">TARGET 90%</div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cust. Satisfaction</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-yellow-400">{stats.operationalMetrics.customerSatisfaction}★</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} className={`w-2 h-2 ${i <= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} />)}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Repeat Order Rate</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-blue-400">{stats.operationalMetrics.repeatOrderRate}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mockup SLA</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-primary">{stats.operationalMetrics.mockupSlaCompliance}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom padding for mobile bar */}
        <div className="h-4" />
      </div>

      {/* Mobile Bottom Navigation (Visible only on small screens) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-3 flex items-center justify-between md:hidden z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button className="flex flex-col items-center gap-1 text-primary">
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button 
          className="flex flex-col items-center gap-1 text-slate-400"
          onClick={() => router.push("/admin/orders")}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] font-medium">Orders</span>
        </button>
        <button 
          className="flex flex-col items-center gap-1 text-slate-400"
          onClick={() => router.push("/admin/vendors")}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Vendors</span>
        </button>
        <button 
          className="flex flex-col items-center gap-1 text-slate-400"
          onClick={() => router.push("/admin/content")}
        >
          <Bell className="w-5 h-5" />
          <span className="text-[10px] font-medium">Alerts</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ErrorBoundary>
        <AdminDashboardContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
