"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, CheckCircle2, XCircle, Clock, Building2, 
  Star, Package, ChevronRight, Store, AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ApiError } from "@/components/errors/ApiError";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

interface Vendor {
  id: string;
  name: string;
  description?: string;
  image?: string;
  city: string;
  status: "pending" | "approved" | "rejected";
  onboardingStatus: "pending" | "submitted" | "approved" | "rejected";
  createdAt: string;
  userId: string;
  rating: number;
  totalOrders: number;
}

/**
 * Admin Vendors Page
 * Swiggy Dec 2025 pattern: Exception-based (Approval Queue) + Active Management
 */
function AdminVendorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>(
    searchParams.get("status") || "all"
  );
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/");
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchVendors();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [user, router, filterStatus, searchQuery]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "all") {
        params.set("status", filterStatus);
      }
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const data = await apiClient.get<Vendor[]>(`/admin/vendors?${params.toString()}`);
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (e: React.MouseEvent, vendorId: string) => {
    e.stopPropagation();
    try {
      setProcessingId(vendorId);
      await apiClient.patch(`/admin/vendors/${vendorId}/approve`);
      toast.success("Vendor approved", "Vendor has been approved successfully");
      fetchVendors();
    } catch (err) {
      toast.error("Failed to approve vendor", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e: React.MouseEvent, vendorId: string) => {
    e.stopPropagation();
    try {
      setProcessingId(vendorId);
      await apiClient.patch(`/admin/vendors/${vendorId}/reject`);
      toast.success("Vendor rejected", "Vendor has been rejected");
      fetchVendors();
    } catch (err) {
      toast.error("Failed to reject vendor", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingVendors = useMemo(() => vendors.filter(v => v.status === "pending"), [vendors]);
  const activeVendors = useMemo(() => vendors.filter(v => v.status !== "pending"), [vendors]);

  if (loading && vendors.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="space-y-4 pt-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Vendors</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{vendors.length} Total Partners</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => fetchVendors()}>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-none shadow-sm h-11 rounded-xl"
          />
        </div>

        {/* Priority Approval Queue */}
        {pendingVendors.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              Approval Queue ({pendingVendors.length})
            </h2>
            <div className="grid gap-3">
              {pendingVendors.map((vendor) => (
                <Card 
                  key={vendor.id} 
                  className="border-none shadow-sm ring-1 ring-blue-100 bg-blue-50/30 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
                  onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                >
                  <CardContent className="p-4 flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white shadow-sm overflow-hidden shrink-0">
                        <ImageWithFallback src={vendor.image || ""} alt={vendor.name} className="w-full h-full object-cover" />
                      </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-bold truncate">{vendor.name}</h3>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">{vendor.city}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-600 border-none text-[10px] font-black uppercase">NEW</Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-[10px] font-black uppercase px-4 flex-1"
                          onClick={(e) => handleApprove(e, vendor.id)}
                          disabled={processingId === vendor.id}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 text-[10px] font-black uppercase px-4"
                          onClick={(e) => handleReject(e, vendor.id)}
                          disabled={processingId === vendor.id}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Vendor Management */}
        <div className="space-y-3">
          <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Store className="w-3 h-3" />
            Active Partners
          </h2>
          <div className="grid gap-3">
            {activeVendors.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-100" />
                <p className="text-sm text-muted-foreground font-medium">No active vendors found</p>
              </div>
            ) : (
              activeVendors.map((vendor) => (
                <Card 
                  key={vendor.id} 
                  className="border-none shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all"
                  onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                >
                  <CardContent className="p-0">
                      <div className="p-4 flex gap-4">
                        <div className="w-14 h-14 rounded-xl bg-slate-50 overflow-hidden shrink-0">
                          <ImageWithFallback src={vendor.image || ""} alt={vendor.name} className="w-full h-full object-cover" />
                        </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-bold truncate">{vendor.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-[11px] font-bold">{vendor.rating || "New"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Package className="w-3 h-3" />
                                <span className="text-[11px] font-medium">{vendor.totalOrders} orders</span>
                              </div>
                            </div>
                          </div>
                          <Badge className={cn(
                            "border-none text-[9px] font-black uppercase",
                            vendor.status === "approved" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                          )}>
                            {vendor.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 px-4 py-2 flex items-center justify-between border-t border-slate-100">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{vendor.city}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminVendorsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ErrorBoundary>
        <AdminVendorsContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
