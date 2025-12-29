"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowLeft,
  DollarSign,
  Info,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

interface VendorDetail {
  id: string;
  name: string;
  description: string;
  status: string;
  onboardingStatus: string;
  gstin?: string;
  pan?: string;
  bankAccount?: {
    accountNumber: string;
    ifsc: string;
    beneficiaryName: string;
  };
  onboardingData?: any;
  commissionRate: number;
  user: {
    name: string;
    email: string;
    phone: string;
  };
}

export default function AdminVendorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [commission, setCommission] = useState(18);

  useEffect(() => {
    fetchVendor();
  }, [id]);

  const fetchVendor = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<VendorDetail>(`/admin/vendors/${id}`);
      setVendor(data);
      setCommission(data.commissionRate);
    } catch (error) {
      toast.error("Failed to load vendor details");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await apiClient.patch(`/admin/vendors/${id}/approve`, {});
      toast.success("Vendor application approved!");
      fetchVendor();
    } catch (error) {
      toast.error("Failed to approve vendor");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCommission = async () => {
    try {
      setActionLoading(true);
      await apiClient.patch(`/admin/vendors/${id}`, { commissionRate: commission.toString() });
      toast.success("Commission rate updated!");
      fetchVendor();
    } catch (error) {
      toast.error("Failed to update commission");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
            <div className="flex-1">
              <h1 className="font-bold text-lg">{vendor.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={vendor.status === "approved" ? "default" : "secondary"}>
                  Status: {vendor.status}
                </Badge>
                <Badge variant="outline">
                  Onboarding: {vendor.onboardingStatus}
                </Badge>
                {vendor.status === "approved" && (
                  <Link href={`/partner/${id}`} target="_blank">
                    <Badge variant="outline" className="flex items-center gap-1 cursor-pointer hover:bg-muted">
                      <ExternalLink className="w-3 h-3" />
                      View as Customer
                    </Badge>
                  </Link>
                )}
              </div>
            </div>
          {vendor.status === "pending" && (
            <div className="flex gap-2">
              <Button variant="outline" className="text-red-600 border-red-200">Reject</Button>
              <Button onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Approve Partner"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">GSTIN</Label>
                  <p className="font-medium">{vendor.gstin || "Not provided"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">PAN</Label>
                  <p className="font-medium">{vendor.pan || "Not provided"}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Bank Account</Label>
                <div className="bg-slate-50 p-3 rounded-lg border mt-1 space-y-1">
                  <p className="text-sm font-semibold">{vendor.bankAccount?.beneficiaryName}</p>
                  <p className="text-xs text-muted-foreground">A/C: {vendor.bankAccount?.accountNumber}</p>
                  <p className="text-xs text-muted-foreground">IFSC: {vendor.bankAccount?.ifsc}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Uploaded Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {vendor.onboardingData?.documents && Object.entries(vendor.onboardingData.documents).map(([key, url]: [string, any]) => (
                  <a 
                    key={key}
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium uppercase">{key}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </a>
                ))}
                {!vendor.onboardingData?.documents && (
                  <p className="text-xs text-muted-foreground col-span-2">No documents uploaded</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Store Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Store Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {vendor.onboardingData?.storePhotos?.map((url: string, idx: number) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={url} alt="Store" className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Settings / Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Revenue Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commission">Commission Rate (%)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="commission" 
                    type="number" 
                    value={commission}
                    onChange={e => setCommission(parseFloat(e.target.value))}
                  />
                  <Button variant="outline" onClick={handleUpdateCommission} disabled={actionLoading}>
                    Save
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Default is 18%. This is deducted from every order.</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Person */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Partner Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{vendor.user.name[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{vendor.user.name}</p>
                  <p className="text-xs text-muted-foreground">Owner</p>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <span className="truncate">{vendor.user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span>{vendor.user.phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
