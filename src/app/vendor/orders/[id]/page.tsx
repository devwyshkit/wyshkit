"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Package, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { MockupUploader } from "@/components/vendor/MockupUploader";
import { CountdownTimer } from "@/components/vendor/CountdownTimer";
import Image from "next/image";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    customization?: {
      text?: string;
      photo?: string;
    };
  }>;
  deliveryAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
  };
  mockupImages?: Record<string, string[]>;
  createdAt: string;
  acceptDeadline?: string;
}

export default function VendorOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [mockups, setMockups] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<OrderDetail>(`/vendor/orders/${id}`);
      setOrder(data);
      if (data.mockupImages) {
        setMockups(data.mockupImages);
      }
    } catch (error) {
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setActionLoading(true);
      await apiClient.post(`/vendor/orders/${id}/accept`, {});
      toast.success("Order accepted!");
      fetchOrder();
    } catch (error) {
      toast.error("Failed to accept order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitMockups = async () => {
    try {
      setActionLoading(true);
      await apiClient.post(`/vendor/orders/${id}/mockup`, { mockupImages: mockups });
      toast.success("Mockups submitted for approval!");
      fetchOrder();
    } catch (error) {
      toast.error("Failed to submit mockups");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReady = async () => {
    try {
      setActionLoading(true);
      await apiClient.post(`/vendor/orders/${id}/ready`, {});
      toast.success("Order marked as ready for pickup!");
      fetchOrder();
    } catch (error) {
      toast.error("Failed to mark order as ready");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!order) return null;

  const renderActions = () => {
    switch (order.status) {
      case "pending":
        // Calculate accept deadline (5 minutes from order creation)
        const acceptDeadline = order.acceptDeadline || 
          new Date(new Date(order.createdAt).getTime() + 5 * 60 * 1000).toISOString();
        
        return (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-600">Accept within:</span>
              <CountdownTimer 
                deadline={acceptDeadline} 
                onExpire={() => {
                  toast.error("Order acceptance window expired");
                  router.push("/vendor/orders");
                }}
              />
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 h-12" onClick={() => router.back()}>Reject</Button>
              <Button className="flex-[2] h-12" onClick={handleAccept} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Accept Order"}
              </Button>
            </div>
          </div>
        );
      case "personalizing":
        return (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10">
            <Button 
              className="w-full h-12" 
              onClick={handleSubmitMockups} 
              disabled={actionLoading || Object.keys(mockups).length === 0}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Submit Mockups for Approval"}
            </Button>
          </div>
        );
      case "mockup_ready":
        return (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">Awaiting Customer Approval</p>
              <p className="text-sm text-yellow-700">Customer has been notified to review the mockups.</p>
            </div>
          </div>
        );
      case "approved":
      case "crafting":
        return (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10">
            <Button className="w-full h-12 bg-green-600 hover:bg-green-700" onClick={handleMarkReady} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Mark as Ready for Pickup"}
            </Button>
          </div>
        );
      case "ready_for_pickup":
        return (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800">Ready for Pickup</p>
              <p className="text-sm text-blue-700">Waiting for delivery partner to pick up the order.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold">Order #{order.orderNumber}</h1>
            <Badge variant="secondary" className="capitalize">
              {order.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {renderActions()}

        {/* Customization Details (Critical for vendor) */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Customization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="space-y-2 pb-2 border-b last:border-0">
                <p className="text-xs font-bold text-muted-foreground uppercase">{item.productName}</p>
                {item.customization?.text && (
                  <div>
                    <p className="text-xs text-muted-foreground">Text to Engrave/Print:</p>
                    <p className="text-sm font-medium">{item.customization.text}</p>
                  </div>
                )}
                {item.customization?.photo && (
                  <div>
                    <p className="text-xs text-muted-foreground">Customer Photo:</p>
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border bg-white mt-1">
                      <Image src={item.customization.photo} alt="Customer Photo" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                    </div>
                  </div>
                )}
                {!item.customization?.text && !item.customization?.photo && (
                  <p className="text-xs text-muted-foreground italic">No personalization requested</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Mockup Upload Section (Visible when personalizing) */}
        {order.status === "personalizing" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upload Mockups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {order.items.map((item) => (
                <MockupUploader 
                  key={item.productId}
                  orderId={order.id}
                  productId={item.productId}
                  productName={item.productName}
                  initialUrls={mockups[item.productId] || []}
                  onUpload={(urls) => setMockups(prev => ({ ...prev, [item.productId]: urls }))}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-sm">₹{(item.price * item.quantity).toLocaleString()}</p>
              </div>
            ))}
            <div className="pt-2 border-t flex justify-between items-center font-bold">
              <span>Total Payout Share</span>
              <span className="text-primary">₹{order.total.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Customer & Delivery */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Delivery Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{order.deliveryAddress.name}</p>
                <p className="text-xs text-muted-foreground">{order.deliveryAddress.address}, {order.deliveryAddress.city} - {order.deliveryAddress.pincode}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm">{order.deliveryAddress.phone}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
