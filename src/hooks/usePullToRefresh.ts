"use client";

import { useEffect, useRef, useState } from "react";
import { logger } from "@/lib/utils/logger";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  enabled?: boolean;
  threshold?: number; // Distance in pixels to trigger refresh
}

/**
 * Pull to Refresh Hook
 * Detects pull gesture on mobile and triggers refresh callback
 * Swiggy Dec 2025 pattern: Native pull-to-refresh for data updates
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 80,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const currentY = useRef<number>(0);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at the top of the page
      if (window.scrollY > 10) return;
      
      startY.current = e.touches[0].clientY;
      currentY.current = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === null || window.scrollY > 10) return;

      currentY.current = e.touches[0].clientY - startY.current;

      // Prevent default scrolling if pulling down
      if (currentY.current > 0 && window.scrollY === 0) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (startY.current === null) return;

      // Check if pulled down enough to trigger refresh
      if (currentY.current >= threshold && window.scrollY === 0 && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          logger.error("[PullToRefresh] Refresh failed", error);
        } finally {
          setIsRefreshing(false);
        }
      }

      startY.current = null;
      currentY.current = 0;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, threshold, onRefresh, isRefreshing]);

  return {
    isRefreshing,
    pullDistance: currentY.current,
  };
}



