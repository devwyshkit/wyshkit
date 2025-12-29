"use client";

import { useCart } from "@/hooks/useCart";
import { useVendor } from "@/hooks/api/useVendor";
import { useAddresses } from "@/hooks/api/useAddresses";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, Zap, ShieldCheck, MapPin, ChevronRight, Plus, Check, Truck, Package, Loader2 } from "lucide-react";
import Link from "next/link";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Drawer } from "vaul";
import { Input } from "@/components/ui/input";
import { EmptyCart } from "@/components/empty/EmptyCart";
import { appConfig } from "@/lib/config/app";
import { searchPlaces, getPlaceDetails, parseAddress } from "@/lib/services/google-places";
import { logger } from "@/lib/utils/logger";
import { useToast } from "@/hooks/useToast";
import { calculateMaxCashbackUsage, isEligibleForCashback } from "@/lib/utils/cashback";
import { apiClient } from "@/lib/api/client";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { calculateItemPrice } from "@/lib/utils/pricing";
import { openRazorpayCheckout, type RazorpayPaymentResponse, type RazorpayError } from "@/lib/services/razorpay-checkout";

export default function CartPage() {
  const { items, totalPrice, vendorId, removeItem, clearCart } = useCart();
  const [deliveryType, setDeliveryType] = useState<"standard" | "express">("standard");
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [useCashback, setUseCashback] = useState(false);
  const [gstin, setGstin] = useState("");
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();
  const loginRedirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { vendor } = useVendor(vendorId);
  const isIntercity = vendor && !vendor.isHyperlocal;

  // Get userId from auth session
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id || null;
  const { addresses: savedAddresses, loading: addressesLoading, createAddress } = useAddresses(userId);

  const [selectedAddress, setSelectedAddress] = useState<{
    id: string;
    label?: string;
    name: string;
    address: string;
    city: string;
    pincode: string;
    phone: string;
  } | null>(null);

  const [newAddress, setNewAddress] = useState({ 
    name: "", 
    address: "", 
    city: "", 
    pincode: "", 
    phone: "",
    label: "Home" as "Home" | "Work" | "Other"
  });

  // Validation state for new address
  const [addressErrors, setAddressErrors] = useState<{
    name?: string;
    address?: string;
    city?: string;
    pincode?: string;
    phone?: string;
  }>({});

  // Google Places autocomplete state
  const [addressQuery, setAddressQuery] = useState("");
  const [predictions, setPredictions] = useState<Array<{ placeId: string; description: string; mainText: string; secondaryText: string }>>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  // Access NEXT_PUBLIC env vars - these are safe in client components (Next.js replaces at build time)
  // Swiggy Dec 2025 pattern: Use NEXT_PUBLIC_ vars directly in client components
  const apiKey = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "") : "";

  // Set default address when addresses load
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddress) {
      const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
      setSelectedAddress({
        id: defaultAddr.id,
        name: defaultAddr.recipientName,
        address: defaultAddr.address,
        city: defaultAddr.city,
        pincode: defaultAddr.pincode,
        phone: defaultAddr.phone,
      });
    }
  }, [savedAddresses, selectedAddress]);

  // Debounced Google Places search for address input
  useEffect(() => {
    if (!addressQuery.trim() || !apiKey) {
      setPredictions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const results = await searchPlaces(addressQuery, apiKey);
        setPredictions(results);
      } catch (error) {
        logger.error("[Cart] Places search failed", error);
        setPredictions([]);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [addressQuery, apiKey]);

  const handlePlaceSelect = async (placeId: string) => {
    if (!apiKey) return;

    setIsSearchingPlaces(true);
    try {
      const details = await getPlaceDetails(placeId, apiKey);
      if (details) {
        const parsed = parseAddress(details);
        setNewAddress(prev => ({
          ...prev,
          address: parsed.address,
          city: parsed.city,
          pincode: parsed.pincode,
        }));
        setAddressQuery("");
        setPredictions([]);
      }
    } catch (error) {
      logger.error("[Cart] Place selection failed", error);
      toast.error("Failed to load address details", "Please try again");
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!newAddress.name || !newAddress.address || !newAddress.city || !newAddress.pincode || !newAddress.phone) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!userId) {
      toast.error("Please login to save addresses");
      return;
    }

    setIsSavingAddress(true);
    try {
      const saved = await createAddress({
        userId,
        recipientName: newAddress.name,
        phone: newAddress.phone,
        address: newAddress.address,
        city: newAddress.city,
        pincode: newAddress.pincode,
        isDefault: savedAddresses.length === 0, // First address is default
      });

      if (saved) {
        setSelectedAddress({
          id: saved.id,
          name: saved.recipientName,
          address: saved.address,
          city: saved.city,
          pincode: saved.pincode,
          phone: saved.phone,
        });
        setNewAddress({ name: "", address: "", city: "", pincode: "", phone: "", label: "Home" });
        setAddressQuery("");
        setIsAddressSheetOpen(false);
        toast.success("Address saved successfully");
      }
    } catch (error) {
      logger.error("[Cart] Failed to save address", error);
      toast.error("Failed to save address", "Please try again");
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Fetch wallet balance
  useEffect(() => {
    if (!userId) {
      setWalletLoading(false);
      return;
    }

    const fetchWallet = async () => {
      try {
        setWalletLoading(true);
        const response = await apiClient.get<{ wallet: { balance: number } }>("/users/wallet");
        setCashbackBalance(response.wallet.balance || 0);
      } catch (error) {
        logger.error("[Cart] Failed to fetch wallet", error);
        setCashbackBalance(0);
      } finally {
        setWalletLoading(false);
      }
    };

    fetchWallet();
  }, [userId]);

  // Show loading state while fetching auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show error if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Please sign in to continue</p>
          <Button onClick={() => router.push("/login")}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <EmptyCart />
        </div>
      </div>
    );
  }

  const deliveryFee = isIntercity 
    ? (deliveryType === "express" ? appConfig.delivery.intercity.express : appConfig.delivery.intercity.standard)
    : (deliveryType === "express" ? appConfig.delivery.local.express : appConfig.delivery.local.standard);
  
  const platformFee = appConfig.platformFee;
  const orderValue = totalPrice + deliveryFee + platformFee;
  const canUseCashback = isEligibleForCashback(orderValue) && cashbackBalance > 0;
  const maxCashbackUsage = canUseCashback 
    ? calculateMaxCashbackUsage(orderValue, cashbackBalance)
    : 0;
  const cashbackDeduction = useCashback && canUseCashback ? maxCashbackUsage : 0;
  const finalTotal = orderValue - cashbackDeduction;

  // Memoized orderItems transformation
  const orderItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    return items.map((item) => {
      const itemPrice = calculateItemPrice({
        price: item.price,
        variants: item.variants,
        addOns: item.addOns,
        selectedVariants: item.selectedVariants,
        selectedAddOns: item.selectedAddOns,
      });

      return {
        productId: item.id,
        quantity: item.quantity,
        price: itemPrice,
        variants: item.selectedVariants,
        addOns: item.selectedAddOns,
        customization: item.customization,
      };
    });
  }, [items]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (loginRedirectTimerRef.current) {
        clearTimeout(loginRedirectTimerRef.current);
      }
    };
  }, []);

  const handlePayment = async () => {
    // Check if user is authenticated
    if (!user) {
      toast.error("Please sign in to continue", "You need to be signed in to place an order");
      router.push(`/login?returnUrl=${encodeURIComponent("/cart")}`);
      return;
    }

    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      setIsAddressSheetOpen(true);
      return;
    }

    // Validate selected address format
    if (!selectedAddress.pincode || !/^\d{6}$/.test(selectedAddress.pincode)) {
      toast.error("Invalid address", "Please select a valid address with 6-digit pincode");
      setIsAddressSheetOpen(true);
      return;
    }

    if (!selectedAddress.phone || !/^[6-9]\d{9}$/.test(selectedAddress.phone)) {
      toast.error("Invalid phone number", "Please select an address with a valid 10-digit phone number");
      setIsAddressSheetOpen(true);
      return;
    }

    if (!vendorId) {
      toast.error("Invalid vendor", "Please try again");
      return;
    }

    setIsPaymentProcessing(true);
    
    // Show loading state immediately
    toast.info("Processing order...", "Please wait");
    
    try {
      // Prepare order payload (use memoized orderItems)
      const orderPayload = {
        vendorId,
        items: orderItems,
        deliveryAddress: {
          name: selectedAddress.name,
          phone: selectedAddress.phone,
          address: selectedAddress.address,
          city: selectedAddress.city,
          pincode: selectedAddress.pincode,
        },
        deliveryFee,
        platformFee,
        cashbackUsed: cashbackDeduction,
        deliveryType: isIntercity ? "intercity" : "local",
        ...(gstin.trim() ? { gstin: gstin.trim() } : {}),
      };

      // Create order via API
      const response = await apiClient.post<{
        orderId: string;
        orderNumber: string;
        status: string;
        total: number;
        paymentId?: string | null;
        razorpayOrderId?: string | null;
      }>("/orders", orderPayload);

      const orderNumber = response.orderNumber;
      const razorpayOrderId = response.paymentId || response.razorpayOrderId;

      // If Razorpay order ID is available, open checkout
      if (razorpayOrderId) {
        const amountInPaise = Math.round(totalPrice * 100);
        
        // Open Razorpay checkout
        await openRazorpayCheckout({
          orderId: razorpayOrderId,
          amount: amountInPaise,
          currency: "INR",
          name: "WyshKit",
          description: `Order #${orderNumber}`,
          prefill: {
            name: user.name || undefined,
            contact: user.phone || undefined,
          },
          handler: async (paymentResponse: RazorpayPaymentResponse) => {
            // Payment successful - verify with backend
            try {
              // Verify payment with backend
              const verifyResponse = await apiClient.post<{
                success: boolean;
                orderId: string;
                orderNumber: string;
              }>("/payment/verify", {
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                orderId: response.orderId,
              });

              if (verifyResponse.success) {
                // Clear cart after successful payment
                clearCart();
                toast.success("Payment successful!", `Order #${orderNumber} confirmed. Redirecting...`);
                
                // Redirect to success page
                setTimeout(() => {
                  router.push(`/payment/success?orderId=${response.orderId}&orderNumber=${orderNumber}`);
                }, 1000);
              } else {
                toast.error("Payment verification failed", "Please contact support with order number");
                router.push(`/payment/failure?orderId=${response.orderId}&orderNumber=${orderNumber}`);
              }
            } catch (verifyError) {
              logger.error("[Cart] Payment verification failed", verifyError);
              toast.error("Payment verification failed", "Please contact support with order number");
              router.push(`/payment/failure?orderId=${response.orderId}&orderNumber=${orderNumber}`);
            } finally {
              setIsPaymentProcessing(false);
            }
          },
          onError: (error: RazorpayError) => {
            logger.error("[Cart] Razorpay payment error", error);
            
            // Don't clear cart on payment failure
            setIsPaymentProcessing(false);
            
            if (error.code === "USER_CLOSED") {
              toast.error("Payment cancelled", "You can try again when ready");
            } else {
              toast.error("Payment failed", error.description || "Please try again or use a different payment method");
              router.push(`/payment/failure?orderId=${response.orderId}&orderNumber=${orderNumber}`);
            }
          },
        });
      } else {
        // No payment required or payment ID not available
        // This shouldn't happen in normal flow, but handle gracefully
        logger.warn("[Cart] No Razorpay order ID in response", response);
        clearCart();
        toast.success("Order placed successfully!", `Order #${orderNumber}. Redirecting to orders...`);
        setTimeout(() => {
          router.push("/orders");
        }, 1000);
        setIsPaymentProcessing(false);
      }
    } catch (error: unknown) {
      logger.error("[Cart] Order creation failed", error);
      
      // Type guard for API errors
      const isApiError = (err: unknown): err is { status?: number; data?: { error?: string; details?: Array<{ message?: string }> }; message?: string } => {
        return typeof err === 'object' && err !== null && ('status' in err || 'message' in err);
      };
      
      // Handle specific error cases with actionable messages
      if (isApiError(error) && error.status === 401) {
        toast.error("Authentication required", "Please sign in to continue. You'll be redirected to login.");
        loginRedirectTimerRef.current = setTimeout(() => {
          router.push(`/login?returnUrl=${encodeURIComponent("/cart")}`);
        }, 1500);
        return;
      }
      
      if (isApiError(error) && error.status === 400) {
        const errorMessage = error.data?.error || "Invalid order data";
        const details = error.data?.details;
        if (details && Array.isArray(details)) {
          const detailMessages = details.map((d) => d.message).filter(Boolean).join(", ");
          toast.error("Validation error", `Please fix: ${detailMessages || errorMessage}`);
        } else {
          toast.error("Invalid order", errorMessage);
        }
        return;
      }
      
      if (isApiError(error) && error.status === 500) {
        toast.error("Server error", "Our servers are experiencing issues. Please try again in a moment.");
        return;
      }
      
      // Network/timeout errors - preserve cart and show retry option
      if (error instanceof Error && (error.message.includes("timeout") || error.message.includes("network") || error.message.includes("fetch"))) {
        toast.error("Connection error", "Please check your internet connection and try again. Your cart has been saved.");
        return;
      }
      
      // Generic error with actionable message
      const errorMessage = isApiError(error) ? error.message : error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error("Order failed", `${errorMessage}. Please try again or contact support if the issue persists.`);
      // Cart is preserved on error, user can retry
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleAddressSelect = (address: typeof savedAddresses[0]) => {
    setSelectedAddress({
      id: address.id,
      name: address.recipientName,
      address: address.address,
      city: address.city,
      pincode: address.pincode,
      phone: address.phone,
    });
    setIsAddressSheetOpen(false);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-muted/30 pb-28">
      <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
        <div className="bg-background rounded-xl border overflow-hidden">
          <button 
            type="button"
            onClick={() => setIsAddressSheetOpen(true)}
            className="w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors"
            aria-label="Select or change delivery address"
          >
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              {selectedAddress ? (
                <>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-muted-foreground">Deliver to</span>
                  </div>
                  <p className="font-medium text-sm truncate">{selectedAddress.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedAddress.address}, {selectedAddress.city}</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-muted-foreground">Deliver to</span>
                  </div>
                  <p className="font-medium text-sm text-muted-foreground">Select address</p>
                  <p className="text-xs text-muted-foreground">Tap to choose</p>
                </>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
          </button>
        </div>

        {vendor && (
          <div className="bg-background rounded-xl p-3 border flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
              <ImageWithFallback src={vendor.image || ""} alt={vendor.name || "Vendor"} fill sizes="40px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-medium text-sm truncate">{vendor.name || "Unknown Vendor"}</h2>
              <p className="text-xs text-muted-foreground">
                {vendor.distance || "N/A"} • {vendor.deliveryTime || "N/A"}
              </p>
            </div>
            <span className={cn(
              "text-[10px] font-medium px-2 py-1 rounded",
              isIntercity ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
            )}>
              {isIntercity ? "Intercity" : "Local"}
            </span>
          </div>
        )}

        <div className="bg-background rounded-xl border">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-base md:text-lg font-bold text-foreground">Items</h3>
            <button 
              type="button"
              onClick={clearCart} 
              className="text-sm text-primary font-medium"
              aria-label="Clear all items from cart"
            >
              Clear
            </button>
          </div>
          
          <div className="divide-y">
            {(items && Array.isArray(items) ? items : []).map((item) => (
              <div key={item.id} className="flex gap-4 p-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  <ImageWithFallback src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base truncate">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  <p className="text-lg font-bold mt-0.5">
                    ₹{calculateItemPrice({
                      price: item.price,
                      variants: item.variants,
                      addOns: item.addOns,
                      selectedVariants: item.selectedVariants,
                      selectedAddOns: item.selectedAddOns,
                    }) * item.quantity}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => removeItem(item.id)} 
                  className="text-muted-foreground hover:text-destructive p-1 h-fit"
                  aria-label={`Remove ${item.name} from cart`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background rounded-xl border overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-base md:text-lg font-bold text-foreground">Delivery</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <button 
              type="button"
              className={cn(
                "p-4 rounded-xl border text-left transition-all hover:shadow-md",
                deliveryType === 'standard' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'
              )}
              onClick={() => setDeliveryType('standard')}
              aria-label={`Select standard delivery - ${isIntercity ? "2-5 days" : "40 min"} - ₹${isIntercity ? 99 : 49}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Standard</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {isIntercity ? "2-5 days" : "40 min"}
              </p>
              <span className="text-base font-bold">₹{isIntercity ? 99 : 49}</span>
            </button>
            <button 
              type="button"
              className={cn(
                "p-4 rounded-xl border text-left transition-all hover:shadow-md",
                deliveryType === 'express' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'
              )}
              onClick={() => setDeliveryType('express')}
              aria-label={`Select express delivery - ${isIntercity ? "1-2 days" : "60 min"} - ₹${isIntercity ? 199 : 149}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Express</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {isIntercity ? "1-2 days" : "60 min"}
              </p>
              <span className="text-base font-bold">₹{isIntercity ? 199 : 149}</span>
            </button>
          </div>
        </div>

        <div className="bg-background rounded-xl border overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-base md:text-lg font-bold text-foreground">GSTIN (Optional)</h3>
          </div>
          <div className="p-4">
            <Input 
              placeholder="Enter GSTIN" 
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              className="h-10 text-sm"
              maxLength={15}
            />
          </div>
        </div>

        {canUseCashback && !walletLoading && (
          <button
            type="button"
            onClick={() => setUseCashback(!useCashback)}
            className={cn(
              "w-full bg-background rounded-xl p-4 border flex items-center gap-3 transition-colors",
              useCashback && "border-primary bg-primary/5"
            )}
            aria-label={useCashback ? "Disable cashback" : `Use ₹${(cashbackBalance || 0).toLocaleString("en-IN")} cashback`}
          >
            <div className={cn(
              "w-5 h-5 rounded border flex items-center justify-center transition-colors",
              useCashback ? "bg-primary border-primary" : "border-border"
            )}>
              {useCashback && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Use ₹{(cashbackBalance || 0).toLocaleString("en-IN")} cashback</p>
              <p className="text-xs text-muted-foreground">Save up to ₹{(maxCashbackUsage || 0).toLocaleString("en-IN")}</p>
            </div>
          </button>
        )}

        <div className="bg-background rounded-xl p-4 border">
          <h3 className="text-base md:text-lg font-bold text-foreground mb-4">Bill Summary</h3>
          <div className="space-y-3 text-base">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Total</span>
              <span className="font-semibold">₹{(totalPrice || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="font-semibold">₹{deliveryFee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span className="font-semibold">₹{platformFee}</span>
            </div>
            {cashbackDeduction > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Cashback</span>
                <span className="font-semibold">-₹{cashbackDeduction}</span>
              </div>
            )}
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{(finalTotal || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg text-green-700 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Secure payment · Satisfaction guaranteed</span>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-40">
        <div className="max-w-3xl mx-auto">
          <Button 
            className="w-full h-12 font-semibold" 
            onClick={handlePayment}
            disabled={isPaymentProcessing || !selectedAddress}
          >
            {isPaymentProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₹${(finalTotal || 0).toLocaleString("en-IN")}`
            )}
          </Button>
        </div>
      </div>

      <Drawer.Root open={isAddressSheetOpen} onOpenChange={setIsAddressSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
          <Drawer.Content className="bg-background flex flex-col rounded-t-2xl h-[70vh] fixed bottom-0 left-0 right-0 z-[101] outline-none max-w-xl mx-auto">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted mt-3" />
            <div className="p-4 flex-1 overflow-y-auto relative">
              <h2 className="text-sm font-semibold mb-4">Select Address</h2>
              
              {addressesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {savedAddresses.map((addr) => (
                      <button
                        type="button"
                        key={addr.id}
                        onClick={() => handleAddressSelect(addr)}
                        className={cn(
                          "w-full p-3 rounded-xl border text-left transition-colors flex gap-3",
                          selectedAddress?.id === addr.id ? "border-primary bg-primary/5" : "border-border"
                        )}
                        aria-label={`Select address: ${addr.recipientName}, ${addr.address}`}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                          selectedAddress?.id === addr.id ? "border-primary" : "border-border"
                        )}>
                          {selectedAddress?.id === addr.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm">{addr.recipientName}</span>
                            {addr.isDefault && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Default</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{addr.address}, {addr.city}</p>
                          <p className="text-xs text-muted-foreground">{addr.pincode}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add New Address
                    </h3>
                    <div className="space-y-3">
                      <Input 
                        placeholder="Recipient Name" 
                        value={newAddress.name} 
                        onChange={(e) => setNewAddress(p => ({...p, name: e.target.value}))} 
                        className="h-10" 
                      />
                      
                      {/* Address with Google Places autocomplete */}
                      <div className="relative">
                        <Input 
                          placeholder="Search address..." 
                          value={addressQuery}
                          onChange={(e) => {
                            const value = e.target.value;
                            setAddressQuery(value);
                            if (value) {
                              setNewAddress(p => ({...p, address: value}));
                            }
                            if (value.trim() && addressErrors.address) {
                              setAddressErrors(prev => ({ ...prev, address: undefined }));
                            }
                          }}
                          className={cn("h-10 pr-9", addressErrors.address && "border-destructive")}
                          aria-invalid={!!addressErrors.address}
                          aria-describedby={addressErrors.address ? "address-error" : undefined}
                        />
                        {addressErrors.address && (
                          <p id="address-error" className="text-xs text-destructive mt-1 absolute top-full left-0">{addressErrors.address}</p>
                        )}
                        {isSearchingPlaces && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                        {/* Predictions dropdown */}
                        {predictions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                            {predictions.map((pred) => (
                              <button
                                type="button"
                                key={pred.placeId}
                                onClick={() => handlePlaceSelect(pred.placeId)}
                                className="w-full p-3 text-left hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                                aria-label={`Select address: ${pred.mainText}`}
                              >
                                <p className="text-sm font-medium">{pred.mainText}</p>
                                <p className="text-xs text-muted-foreground">{pred.secondaryText}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Input 
                            placeholder="City" 
                            value={newAddress.city} 
                            onChange={(e) => {
                              const value = e.target.value;
                              setNewAddress(p => ({...p, city: value}));
                              if (value.trim() && addressErrors.city) {
                                setAddressErrors(prev => ({ ...prev, city: undefined }));
                              }
                            }}
                            className={cn("h-10", addressErrors.city && "border-destructive")}
                            aria-invalid={!!addressErrors.city}
                            aria-describedby={addressErrors.city ? "city-error" : undefined}
                          />
                          {addressErrors.city && (
                            <p id="city-error" className="text-xs text-destructive mt-1">{addressErrors.city}</p>
                          )}
                        </div>
                        <div>
                          <Input 
                            type="text"
                            inputMode="numeric"
                            placeholder="Pincode (6 digits)" 
                            value={newAddress.pincode} 
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setNewAddress(p => ({...p, pincode: value}));
                              // Real-time validation
                              if (value.length > 0 && value.length !== 6) {
                                setAddressErrors(prev => ({ ...prev, pincode: "Pincode must be 6 digits" }));
                              } else if (value.length === 6) {
                                setAddressErrors(prev => ({ ...prev, pincode: undefined }));
                              } else {
                                setAddressErrors(prev => ({ ...prev, pincode: undefined }));
                              }
                            }}
                            className={cn("h-10", addressErrors.pincode && "border-destructive")}
                            aria-invalid={!!addressErrors.pincode}
                            aria-describedby={addressErrors.pincode ? "pincode-error" : undefined}
                            maxLength={6}
                          />
                          {addressErrors.pincode && (
                            <p id="pincode-error" className="text-xs text-destructive mt-1">{addressErrors.pincode}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Input 
                          type="tel"
                          inputMode="numeric"
                          placeholder="Phone (10 digits)" 
                          value={newAddress.phone} 
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setNewAddress(p => ({...p, phone: value}));
                            // Real-time validation
                            if (value.length > 0) {
                              if (value.length !== 10) {
                                setAddressErrors(prev => ({ ...prev, phone: "Phone must be 10 digits" }));
                              } else if (!/^[6-9]/.test(value)) {
                                setAddressErrors(prev => ({ ...prev, phone: "Phone must start with 6, 7, 8, or 9" }));
                              } else {
                                setAddressErrors(prev => ({ ...prev, phone: undefined }));
                              }
                            } else {
                              setAddressErrors(prev => ({ ...prev, phone: undefined }));
                            }
                          }}
                          className={cn("h-10", addressErrors.phone && "border-destructive")}
                          aria-invalid={!!addressErrors.phone}
                          aria-describedby={addressErrors.phone ? "phone-error" : undefined}
                          maxLength={10}
                        />
                        {addressErrors.phone && (
                          <p id="phone-error" className="text-xs text-destructive mt-1">{addressErrors.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t space-y-2">
              <Button 
                className="w-full h-11" 
                onClick={selectedAddress ? () => setIsAddressSheetOpen(false) : handleSaveAddress}
                disabled={addressesLoading || isSavingAddress || (!selectedAddress && (!newAddress.name || !newAddress.address || !newAddress.city || !newAddress.pincode || !newAddress.phone || !!addressErrors.pincode || !!addressErrors.phone))}
              >
                {isSavingAddress ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : selectedAddress ? (
                  "Confirm"
                ) : (
                  "Save Address"
                )}
              </Button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      </div>
    </ErrorBoundary>
  );
}
