"use client";

import { CartProvider } from "@/hooks/useCart";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Cart service unavailable</h2>
            <p className="text-muted-foreground text-sm">You can still browse, but cart features may not work</p>
          </div>
        </div>
      }
    >
      <CartProvider>
        {children}
      </CartProvider>
      {/* Toaster always renders even if CartProvider fails */}
      <Toaster position="top-center" richColors closeButton />
    </ErrorBoundary>
  );
}
