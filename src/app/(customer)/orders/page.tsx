"use client";

import { useState, useEffect, useRef } from "react";
import { useOrders } from "@/hooks/api/useOrders";
import { useOrderUpdates } from "@/hooks/realtime/useOrderUpdates";
import { OrderListSkeleton } from "@/components/skeletons/OrderSkeleton";
import { EmptyOrders } from "@/components/empty/EmptyOrders";
import { CheckCircle2, ChevronRight, Package, Check, MessageSquare, MapPin, Phone, HelpCircle, Upload, ShoppingBag, Sparkles, AlertCircle } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { Button } from "@/components/ui/button";
import { Drawer } from "vaul";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";

type OrderStatus = "awaiting_details" | "personalizing" | "mockup_ready" | "crafting" | "shipped" | "delivered";

function OrdersPageContent() {
  const { orders, loading: ordersLoading, refetch } = useOrders();
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false);
  const toast = useToast();
  
  // Pull to refresh
  usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
  });
  
  // Use first order if available
  const [activeOrder, setActiveOrder] = useState<{
    id: string;
    vendor: { id: string; name: string; image: string } | null;
    items: Array<{ id: string; name: string; price: number; image?: string; customization?: { text: string; photo: string | null } }>;
    status: OrderStatus;
    timestamp: string;
    eta: string;
    total: number;
    deliveryAddress: {
      name: string;
      address: string;
      city: string;
      pincode: string;
    } | null;
  } | null>(null);

  // Swiggy Dec 2025 pattern: Vendor data comes from joined query, no separate fetch needed

  // Initialize from orders if available
  // Swiggy Dec 2025 pattern: Use stable reference (first order ID) instead of entire orders array
  const firstOrderIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (Array.isArray(orders) && orders.length > 0 && !activeOrder) {
      const firstOrder = orders[0];
      const firstOrderId = firstOrder?.id;
      
      // Only initialize once per order ID - prevent loops
      if (!firstOrderId || firstOrderIdRef.current === firstOrderId) {
        return;
      }
      
      // Only set activeOrder if we have essential data
      if (!firstOrder.deliveryAddress) {
        // Skip if delivery address is missing - data is incomplete
        return;
      }

      const deliveryAddr = firstOrder.deliveryAddress;
      
      // Validate delivery address has required fields
      if (!deliveryAddr.name || !deliveryAddr.address || !deliveryAddr.city || !deliveryAddr.pincode) {
        // Skip if required fields are missing
        return;
      }

      // Use vendor data from joined query (eliminates N+1 problem)
      const vendorData = firstOrder.vendor || (firstOrder.vendorName ? {
        id: firstOrder.vendorId,
        name: firstOrder.vendorName,
        image: ""
      } : null);
      
      setActiveOrder({
        id: firstOrder.id,
        vendor: vendorData ? {
          id: vendorData.id,
          name: vendorData.name,
          image: vendorData.image || ""
        } : null,
        items: (Array.isArray(firstOrder.items) ? firstOrder.items : []).map(item => ({
          id: item.productId,
          name: item.productName || "",
          price: item.price,
          customization: { text: "", photo: null }
        })).filter(item => item.name), // Only include items with names
        status: firstOrder.status as OrderStatus,
        timestamp: firstOrder.createdAt,
        eta: "40 mins",
        total: firstOrder.total,
        deliveryAddress: deliveryAddr
      });

      // Track that we've initialized this order
      firstOrderIdRef.current = firstOrderId;
    }
    
    // Reset ref if orders become empty
    if (!orders || orders.length === 0) {
      firstOrderIdRef.current = null;
    }
    // Only depend on ordersLoading - runs once when orders finish loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersLoading]);

  // Subscribe to real-time updates for active order
  const { orderUpdate, isConnected } = useOrderUpdates(activeOrder?.id || null);

  // Update order when real-time update is received
  useEffect(() => {
    if (orderUpdate && activeOrder) {
      setActiveOrder(prev => prev ? {
        ...prev,
        status: orderUpdate.status as OrderStatus,
        timestamp: orderUpdate.updatedAt,
      } : null);
      
      // Refetch orders to ensure consistency
      refetch();
    }
  }, [orderUpdate, activeOrder, refetch]);

  const [isMockupSheetOpen, setIsMockupSheetOpen] = useState(false);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  
  const [customizations, setCustomizations] = useState<Record<string, { text: string, giftMessage: string }>>({
    "p1": { text: "", giftMessage: "" },
    "p2": { text: "", giftMessage: "" }
  });

  useEffect(() => {
    if (activeOrder && activeOrder.status === "personalizing") {
      const timer = setTimeout(() => {
        setActiveOrder(prev => prev ? ({ ...prev, status: "mockup_ready" }) : null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeOrder?.status]);

  const handleApproveAll = async () => {
    if (!activeOrder) return;
    
    setIsApproving(true);
    try {
      // Swiggy Dec 2025 pattern: Use actual API endpoint for order status updates
      const response = await fetch(`/api/orders/${activeOrder.id}/mockup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: true,
          productId: null, // Approve all products
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve mockups");
      }

      const result = await response.json();
      
      setActiveOrder(prev => prev ? { ...prev, status: "crafting" as OrderStatus } : null);
      setIsMockupSheetOpen(false);
      toast.success("Mockups approved!", "Your order is now being crafted");
      
      // Refetch orders to get updated status
      refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to approve mockups";
      toast.error("Failed to approve mockups", errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDetailsSubmit = async () => {
    if (!activeOrder) return;
    
    setIsSubmittingDetails(true);
    try {
      // Swiggy Dec 2025 pattern: Use actual API endpoint for customization submission
      const customizationsArray = Object.entries(customizations).map(([productId, details]) => ({
        productId,
        text: details.text || "",
        giftMessage: details.giftMessage || "",
        photo: null, // Photo upload would be handled separately
      }));

      const response = await fetch(`/api/orders/${activeOrder.id}/customize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customizations: customizationsArray,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit customization details");
      }

      const result = await response.json();
      
      setActiveOrder(prev => prev ? { ...prev, status: "personalizing" as OrderStatus } : null);
      setIsDetailsSheetOpen(false);
      toast.success("Details submitted!", "Your order is now being personalized");
      
      // Refetch orders to get updated status
      refetch();
    } catch (error) {
      toast.error("Failed to submit details", "Please try again");
    } finally {
      setIsSubmittingDetails(false);
    }
  };

  const statusSteps = [
    { key: "personalizing", label: "Confirmed" },
    { key: "mockup_ready", label: "Preview" },
    { key: "crafting", label: "Crafting" },
    { key: "shipped", label: "Shipped" },
  ];

  const getStepIndex = (status: OrderStatus) => {
    if (status === "awaiting_details") return -1;
    return statusSteps.findIndex(s => s.key === status);
  };

  const currentStepIndex = activeOrder ? getStepIndex(activeOrder.status) : -1;

  if (ordersLoading) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <OrderListSkeleton count={3} />
        </div>
      </div>
    );
  }

  if (!activeOrder && !ordersLoading && (!Array.isArray(orders) || orders.length === 0)) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <EmptyOrders />
        </div>
      </div>
    );
  }

  if (!activeOrder) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <OrderListSkeleton count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        <div className="bg-background rounded-xl p-4 border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">#{activeOrder?.id}</span>
                {activeOrder && activeOrder.status !== "delivered" && isConnected && (
                  <span className="flex items-center gap-1 text-xs text-primary font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <h1 className="text-lg md:text-xl font-bold">
                {activeOrder.status === "awaiting_details" 
                  ? "Details Required" 
                  : activeOrder.status === "shipped"
                  ? "Arriving in 12 mins"
                  : `ETA: ${activeOrder.eta}`}
              </h1>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">₹{activeOrder.total.toLocaleString("en-IN")}</p>
              <p className="text-sm text-muted-foreground">
                {Array.isArray(activeOrder.items) ? activeOrder.items.length : 0} items
              </p>
            </div>
          </div>

          <div className="relative pt-2 pb-1">
            <div className="absolute top-5 left-4 right-4 h-0.5 bg-muted">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${activeOrder.status === "awaiting_details" ? 0 : ((currentStepIndex + 1) / statusSteps.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between relative">
              {statusSteps.map((step, idx) => {
                const isActive = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1.5">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-background z-10",
                      isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {isActive && idx < currentStepIndex ? <Check className="w-3 h-3" strokeWidth={3} /> : idx + 1}
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium",
                      isCurrent ? "text-primary" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {activeOrder.status === "awaiting_details" && (
          <button 
            onClick={() => setIsDetailsSheetOpen(true)}
            className="w-full bg-primary text-white rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <div className="text-left">
                <h3 className="font-semibold text-base">Complete Personalization</h3>
                <p className="text-sm text-white/70">2 items need your details</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {activeOrder.status === "mockup_ready" && (
          <button 
            onClick={() => setIsMockupSheetOpen(true)}
            className="w-full bg-foreground text-background rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              <div className="text-left">
                <h3 className="font-semibold text-base">Mockups Ready</h3>
                <p className="text-sm opacity-70">Approve to start crafting</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <div className="bg-background rounded-xl border overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
              {activeOrder.vendor && activeOrder.vendor.image ? (
                <ImageWithFallback src={activeOrder.vendor.image} alt={activeOrder.vendor.name || "Vendor"} fill sizes="40px" className="object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {activeOrder.vendor && activeOrder.vendor.name ? (
                <>
                  <h3 className="font-semibold text-base">{activeOrder.vendor.name || "Unknown Vendor"}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    Verified Artisan
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Vendor information unavailable</p>
                </div>
              )}
            </div>
            <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y">
            {Array.isArray(activeOrder.items) && activeOrder.items.length > 0 ? (
              activeOrder.items.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex gap-3 p-4">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                    {item.image ? (
                      <ImageWithFallback src={item.image} alt={item.name || ""} fill sizes="56px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.name ? (
                      <>
                        <h4 className="font-semibold text-base truncate">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">Qty: 1</p>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <div className="h-4 bg-muted rounded animate-pulse w-32" />
                        <div className="h-3 bg-muted rounded animate-pulse w-16" />
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-bold shrink-0">₹{item.price.toLocaleString("en-IN")}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No items found
              </div>
            )}
          </div>
        </div>

        {activeOrder.deliveryAddress ? (
          <div className="bg-background rounded-xl p-4 border">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Delivering to</p>
                {activeOrder.deliveryAddress.name && (
                  <p className="font-medium text-sm">{activeOrder.deliveryAddress.name}</p>
                )}
                {activeOrder.deliveryAddress.address && (
                  <p className="text-xs text-muted-foreground">
                    {activeOrder.deliveryAddress.address}
                    {activeOrder.deliveryAddress.city && `, ${activeOrder.deliveryAddress.city}`}
                    {activeOrder.deliveryAddress.pincode && ` - ${activeOrder.deliveryAddress.pincode}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-background rounded-xl p-4 border">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Delivery address not available</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/" className="bg-background rounded-xl p-3 border flex items-center justify-center gap-2 text-sm font-medium">
            <ShoppingBag className="w-4 h-4" />
            Browse
          </Link>
          <button className="bg-background rounded-xl p-3 border flex items-center justify-center gap-2 text-sm font-medium">
            <HelpCircle className="w-4 h-4" />
            Help
          </button>
        </div>
      </div>

      <Drawer.Root open={isDetailsSheetOpen} onOpenChange={setIsDetailsSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
          <Drawer.Content className="bg-background flex flex-col rounded-t-2xl h-[85vh] fixed bottom-0 left-0 right-0 z-[101] outline-none max-w-xl mx-auto">
            <DialogTitle className="sr-only">Customization Details</DialogTitle>
            <DialogDescription className="sr-only">Enter customization details for your order items</DialogDescription>
            <div className="mx-auto w-10 h-1 rounded-full bg-muted mt-3" />
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-5">
                <h2 className="text-sm font-semibold">Customization Details</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter details for your items</p>
              </div>
              
              <div className="space-y-6">
                {Array.isArray(activeOrder.items) && activeOrder.items.map((item) => (
                  <div key={item.id} className="space-y-3 p-4 bg-muted/30 rounded-xl">
                    <div className="flex items-center gap-3 pb-3 border-b">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                        {item.image ? (
                          <ImageWithFallback src={item.image} alt={item.name || ""} width={40} height={40} className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {item.name ? (
                        <h3 className="font-medium text-sm">{item.name}</h3>
                      ) : (
                        <div className="h-4 bg-muted rounded animate-pulse w-24" />
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Custom Text</label>
                      <Input 
                        placeholder="E.g. Happy Birthday Rahul" 
                        className="h-10" 
                        value={customizations[item.id]?.text || ""}
                        onChange={(e) => setCustomizations(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], text: e.target.value }
                        }))}
                        maxLength={30}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Reference Photo (Optional)</label>
                      <div className="h-16 w-full bg-background rounded-lg border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Upload</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Gift Message (Optional)</label>
                      <Textarea 
                        placeholder="A personal note..." 
                        className="min-h-[60px] text-sm resize-none"
                        value={customizations[item.id]?.giftMessage || ""}
                        onChange={(e) => setCustomizations(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], giftMessage: e.target.value }
                        }))}
                        maxLength={150}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t">
              <Button 
                className="w-full h-11 font-medium" 
                onClick={handleDetailsSubmit}
                disabled={isSubmittingDetails || Object.values(customizations).some(c => !c.text.trim())}
              >
                {isSubmittingDetails ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Details"
                )}
              </Button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Drawer.Root open={isMockupSheetOpen} onOpenChange={setIsMockupSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
          <Drawer.Content className="bg-background flex flex-col rounded-t-2xl h-[85vh] fixed bottom-0 left-0 right-0 z-[101] outline-none max-w-xl mx-auto">
            <DialogTitle className="sr-only">Review Mockups</DialogTitle>
            <DialogDescription className="sr-only">Review and approve mockups before crafting begins</DialogDescription>
            <div className="mx-auto w-10 h-1 rounded-full bg-muted mt-3" />
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-5">
                <h2 className="text-sm font-semibold">Review Mockups</h2>
                <p className="text-sm text-muted-foreground mt-1">Approve before crafting begins</p>
              </div>
              
              <div className="space-y-6">
                {Array.isArray(activeOrder.items) && activeOrder.items.map((item) => (
                  <div key={`mock-${item.id}`} className="space-y-3">
                    <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
                    
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden border bg-muted">
                      {item.image ? (
                        <>
                          <ImageWithFallback src={item.image} alt="Mockup" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                          <div className="absolute top-2 left-2">
                            <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">Preview</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Your text</p>
                      <p className="text-sm font-medium">
                        "{customizations[item.id]?.text || (item.name ? "Personalized" : "")}"
                      </p>
                    </div>
                  </div>
                ))}
                
                <div className="bg-amber-50 p-3 rounded-lg flex gap-3">
                  <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 mb-0.5">Artisan's Note</p>
                    <p className="text-xs text-amber-700">
                      Layout optimized for clarity. Deep-etched for durability.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setIsMockupSheetOpen(false)} className="h-11">
                Request Changes
              </Button>
              <Button 
                onClick={handleApproveAll} 
                className="h-11"
                disabled={isApproving}
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve & Ship"
                )}
              </Button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersPageContent />
    </ProtectedRoute>
  );
}

