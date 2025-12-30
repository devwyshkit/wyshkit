"use client";

import { useEffect, useRef } from "react";
import { logger } from "@/lib/utils/logger";

type ReporterProps = {
  /*  ⎯⎯ props are only provided on the global-error page ⎯⎯ */
  error?: Error & { digest?: string };
  reset?: () => void;
};

export default function ErrorReporter({ error, reset }: ReporterProps) {
  /* ─ instrumentation shared by every route ─ */
  const lastOverlayMsg = useRef("");
  const pollRef = useRef<NodeJS.Timeout>();

  // Swiggy Dec 2025 pattern: Don't suppress Chrome extension errors - they're harmless
  // Let the browser handle them naturally. Suppression is an anti-pattern that hides real issues.

  useEffect(() => {
    // SSR safety check - window is only available in browser
    if (typeof window === "undefined") {
      return;
    }

    const inIframe = window.parent !== window;
    if (!inIframe) return;

    /**
     * Check if error is a browser extension error
     */
    const isBrowserExtensionError = (error: unknown): boolean => {
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
          message.includes("runtime.lasterror") ||
          message.includes("message port closed") ||
          message.includes("extension context invalidated")
        );
      }
      return false;
    };

    const send = (payload: unknown) => {
      // Swiggy Dec 2025 pattern: Check for browser extension context before postMessage
      // Some browser extensions may interfere with postMessage
      try {
        // Check if parent window is available and not same-origin blocked
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(payload, "*");
        }
      } catch (error) {
        // Swiggy Dec 2025 pattern: Suppress browser extension errors, log others
        if (isBrowserExtensionError(error)) {
          // Browser extension errors are harmless - suppress in production
          if (process.env.NODE_ENV === "development") {
            logger.debug("[ErrorReporter] Browser extension postMessage error (suppressed)", error);
          }
        } else {
          // Log legitimate errors
          logger.debug("[ErrorReporter] postMessage failed", error);
        }
      }
    };

    const onError = (e: ErrorEvent) =>
      send({
        type: "ERROR_CAPTURED",
        error: {
          message: e.message,
          stack: e.error?.stack,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
          source: "window.onerror",
        },
        timestamp: Date.now(),
      });

    const onReject = (e: PromiseRejectionEvent) =>
      send({
        type: "ERROR_CAPTURED",
        error: {
          message: e.reason?.message ?? String(e.reason),
          stack: e.reason?.stack,
          source: "unhandledrejection",
        },
        timestamp: Date.now(),
      });

    const pollOverlay = () => {
      const overlay = document.querySelector("[data-nextjs-dialog-overlay]");
      const node =
        overlay?.querySelector(
          "h1, h2, .error-message, [data-nextjs-dialog-body]"
        ) ?? null;
      const txt = node?.textContent ?? node?.innerHTML ?? "";
      if (txt && txt !== lastOverlayMsg.current) {
        lastOverlayMsg.current = txt;
        send({
          type: "ERROR_CAPTURED",
          error: { message: txt, source: "nextjs-dev-overlay" },
          timestamp: Date.now(),
        });
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    pollRef.current = setInterval(pollOverlay, 1000);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
      pollRef.current && clearInterval(pollRef.current);
    };
  }, []);

  /* ─ extra postMessage when on the global-error route ─ */
  useEffect(() => {
    // SSR safety check - window and navigator are only available in browser
    if (typeof window === "undefined" || !error) return;
    
    // Check if we're in an iframe before posting message
    const inIframe = window.parent !== window;
    if (!inIframe) return;
    
    /**
     * Check if error is a browser extension error
     */
    const isBrowserExtensionError = (err: unknown): boolean => {
      if (err instanceof Error) {
        const message = err.message.toLowerCase();
        return (
          message.includes("runtime.lasterror") ||
          message.includes("message port closed") ||
          message.includes("extension context invalidated")
        );
      }
      return false;
    };

    try {
      // Check if parent window is available before posting message
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "global-error-reset",
            error: {
              message: error.message,
              stack: error.stack,
              digest: error.digest,
              name: error.name,
            },
            timestamp: Date.now(),
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          },
          "*"
        );
      }
    } catch (postError) {
      // Swiggy Dec 2025 pattern: Suppress browser extension errors, log others
      if (isBrowserExtensionError(postError)) {
        // Browser extension errors are harmless - suppress in production
        if (process.env.NODE_ENV === "development") {
          logger.debug("[ErrorReporter] Browser extension postMessage error (suppressed)", postError);
        }
      } else {
        // Log legitimate errors
        logger.debug("[ErrorReporter] postMessage failed", postError);
      }
    }
  }, [error]);

  /* ─ ordinary pages render nothing ─ */
  if (!error) return null;

  /* ─ global-error UI ─ */
  return (
    <html>
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-destructive">
              Something went wrong!
            </h1>
            <p className="text-muted-foreground">
              An unexpected error occurred. Please try again fixing with Orchids
            </p>
          </div>
          <div className="space-y-2">
            {process.env.NODE_ENV === "development" && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {error.message}
                  {error.stack && (
                    <div className="mt-2 text-muted-foreground">
                      {error.stack}
                    </div>
                  )}
                  {error.digest && (
                    <div className="mt-2 text-muted-foreground">
                      Digest: {error.digest}
                    </div>
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
