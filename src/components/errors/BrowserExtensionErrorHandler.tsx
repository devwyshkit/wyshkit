"use client";

import { useEffect } from "react";
import { logger } from "@/lib/utils/logger";

/**
 * Browser Extension Error Handler
 * Swiggy Dec 2025 pattern: Suppress known harmless browser extension errors
 * while preserving legitimate error logging
 */
export function BrowserExtensionErrorHandler() {
  useEffect(() => {
    // SSR safety check
    if (typeof window === "undefined") {
      return;
    }

    /**
     * Check if error is a known browser extension error
     * These errors are harmless and occur when browser extensions
     * (ad blockers, password managers, etc.) try to communicate with pages
     */
    const isBrowserExtensionError = (error: unknown): boolean => {
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
          message.includes("runtime.lasterror") ||
          message.includes("message port closed") ||
          message.includes("extension context invalidated") ||
          message.includes("receiving end does not exist")
        );
      }
      if (typeof error === "string") {
        const message = error.toLowerCase();
        return (
          message.includes("runtime.lasterror") ||
          message.includes("message port closed") ||
          message.includes("extension context invalidated") ||
          message.includes("receiving end does not exist")
        );
      }
      return false;
    };

    /**
     * Handle unhandled promise rejections
     * Filter out browser extension errors, log legitimate ones
     */
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      if (isBrowserExtensionError(error)) {
        // Suppress browser extension errors in production
        // Log in development for debugging
        if (process.env.NODE_ENV === "development") {
          logger.debug("[BrowserExtension] Suppressed browser extension error", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
        // Prevent error from appearing in console
        event.preventDefault();
        return;
      }
      
      // Log legitimate errors
      logger.error("[BrowserExtension] Unhandled promise rejection", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    };

    /**
     * Handle window errors
     * Filter out browser extension errors, log legitimate ones
     */
    const handleError = (event: ErrorEvent) => {
      const error = event.error || event.message;
      
      if (isBrowserExtensionError(error)) {
        // Suppress browser extension errors in production
        // Log in development for debugging
        if (process.env.NODE_ENV === "development") {
          logger.debug("[BrowserExtension] Suppressed browser extension error", {
            error: error instanceof Error ? error.message : String(error),
            filename: event.filename,
            lineno: event.lineno,
          });
        }
        // Prevent error from appearing in console
        event.preventDefault();
        return;
      }
      
      // Let legitimate errors propagate normally
    };

    /**
     * Override console.error to catch browser extension errors
     * Browser extensions log errors directly via console.error, which cannot be caught by event handlers
     */
    const originalConsoleError = console.error;
    const overrideConsoleError = (...args: unknown[]) => {
      // Check if any argument contains browser extension error messages
      const hasBrowserExtensionError = args.some((arg) => {
        if (typeof arg === "string") {
          const message = arg.toLowerCase();
          return (
            message.includes("runtime.lasterror") ||
            message.includes("message port closed") ||
            message.includes("extension context invalidated") ||
            message.includes("receiving end does not exist")
          );
        }
        if (arg instanceof Error) {
          const message = arg.message.toLowerCase();
          return (
            message.includes("runtime.lasterror") ||
            message.includes("message port closed") ||
            message.includes("extension context invalidated") ||
            message.includes("receiving end does not exist")
          );
        }
        return false;
      });

      if (hasBrowserExtensionError) {
        // Suppress browser extension errors in production
        // Log in development for debugging
        if (process.env.NODE_ENV === "development") {
          logger.debug("[BrowserExtension] Suppressed console.error from browser extension", {
            args: args.map((arg) => (typeof arg === "string" ? arg : String(arg))),
          });
        }
        // Don't call original console.error for browser extension errors
        return;
      }

      // Call original console.error for legitimate errors
      originalConsoleError.apply(console, args);
    };

    // Register error handlers
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);
    
    // Override console.error
    console.error = overrideConsoleError;

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
      // Restore original console.error
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}

