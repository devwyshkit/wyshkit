"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

/**
 * Payment Success Page
 * Swiggy Dec 2025 pattern: Clean success page with clear CTAs
 */
function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("orderId");
    const number = searchParams.get("orderNumber");
    setOrderId(id);
    setOrderNumber(number);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground">
            {orderNumber ? (
              <>Your order <strong>#{orderNumber}</strong> has been confirmed.</>
            ) : (
              "Your payment has been processed successfully."
            )}
          </p>
        </div>

        {/* Order Details */}
        {orderNumber && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Package className="w-4 h-4" />
              <span className="font-medium">Order Number: {orderNumber}</span>
            </div>
            {orderId && (
              <p className="text-xs text-muted-foreground">Order ID: {orderId.slice(0, 8)}...</p>
            )}
          </div>
        )}

        {/* Next Steps */}
        <div className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            You will receive an order confirmation email shortly. Track your order status in the orders section.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/orders">
                View My Orders
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                Continue Shopping
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4 text-center">
        <div className="size-24 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

