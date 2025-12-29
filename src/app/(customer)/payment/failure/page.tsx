"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { XCircle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

/**
 * Payment Failure Page
 * Swiggy Dec 2025 pattern: Clean failure page with retry options
 */
function PaymentFailureContent() {
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
        {/* Failure Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Failure Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Payment Failed</h1>
          <p className="text-muted-foreground">
            {orderNumber ? (
              <>We couldn't process payment for order <strong>#{orderNumber}</strong>.</>
            ) : (
              "We couldn't process your payment."
            )}
          </p>
        </div>

        {/* Order Details */}
        {orderNumber && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="text-sm">
              <span className="font-medium">Order Number: {orderNumber}</span>
            </div>
            {orderId && (
              <p className="text-xs text-muted-foreground">Order ID: {orderId.slice(0, 8)}...</p>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Don't worry, your order has been saved. You can try again or contact support if the issue persists.
          </p>

          {/* Common Reasons */}
          <div className="bg-muted/30 rounded-lg p-4 text-left space-y-2">
            <p className="text-sm font-medium">Common reasons for payment failure:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Insufficient funds in your account</li>
              <li>Incorrect card details</li>
              <li>Network connectivity issues</li>
              <li>Bank security restrictions</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/cart">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/orders">
                View My Orders
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4 text-center">
        <div className="size-24 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <PaymentFailureContent />
    </Suspense>
  );
}

