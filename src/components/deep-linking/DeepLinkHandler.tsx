"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { parseDeepLink, handleDeepLink, DeepLinkPatterns } from "@/lib/utils/deep-linking";
import { logger } from "@/lib/utils/logger";
import { useAuth } from "@/hooks/useAuth";

/**
 * Deep Link Handler Component
 * Swiggy Dec 2025 pattern: Smart URL parameter handling
 * Handles referral codes, product links, order links, etc.
 */
function DeepLinkHandlerContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    // Only handle deep links on client-side
    if (typeof window === "undefined") return;

    // Get current URL
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);

    // Handle referral code (?ref=code)
    const refCode = searchParams.get("ref");
    if (refCode && user?.id) {
      // Store referral code (could save to Supabase or localStorage for later)
      try {
        localStorage.setItem("wyshkit-referral-code", refCode);
        logger.debug("[Deep Link] Referral code stored", { refCode, userId: user.id });
      } catch (error) {
        logger.warn("[Deep Link] Failed to store referral code", error);
      }
    }

    // Handle product/vendor deep links
    // Format: /partner/:id?source=deep_link
    const source = searchParams.get("source");
    if (source === "deep_link") {
      logger.debug("[Deep Link] Deep link source detected", { pathname });
    }

    // Handle order deep links
    // Format: /orders?orderId=xxx
    const orderId = searchParams.get("orderId");
    if (orderId && pathname === "/orders") {
      logger.debug("[Deep Link] Order deep link", { orderId });
      // The orders page should handle this automatically
    }

    // Handle search deep links
    // Format: /search?q=query&occasion=xxx
    const searchQuery = searchParams.get("q");
    const occasion = searchParams.get("occasion");
    if ((searchQuery || occasion) && pathname === "/search") {
      logger.debug("[Deep Link] Search deep link", { searchQuery, occasion });
      // The search page should handle this automatically
    }
  }, [pathname, searchParams, user?.id]);

  // This component doesn't render anything
  return null;
}

export function DeepLinkHandler() {
  return (
    <Suspense fallback={null}>
      <DeepLinkHandlerContent />
    </Suspense>
  );
}

