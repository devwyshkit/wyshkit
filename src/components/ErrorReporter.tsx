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

  // Swiggy Dec 2025 pattern: Suppress Chrome extension runtime errors globally
  useEffect(() => {
    // SSR safety check - window is only available in browser
    if (typeof window === "undefined") {
      return;
    }

    // Suppress Chrome extension runtime errors
    if (typeof chrome !== "undefined" && chrome.runtime) {
      // Override chrome.runtime.lastError to prevent console warnings
      try {
        const originalDescriptor = Object.getOwnPropertyDescriptor(chrome.runtime, 'lastError');
        if (originalDescriptor) {
          Object.defineProperty(chrome.runtime, 'lastError', {
            get: function() {
              // Silently return the error without logging
              return originalDescriptor.get?.call(chrome.runtime);
            },
            configurable: true,
            enumerable: originalDescriptor.enumerable,
          });
        }
      } catch (e) {
        // Ignore if we can't override (some Chrome versions may not allow this)
      }

      // Suppress console errors for chrome extension messages
      const originalConsoleError = console.error;
      console.error = function(...args: unknown[]) {
        const message = args[0]?.toString() || '';
        // Filter out chrome extension errors - Swiggy Dec 2025 pattern: Clean console
        if (
          message.includes('runtime.lastError') ||
          message.includes('message port closed') ||
          message.includes('Unchecked runtime.lastError') ||
          message.includes('The message port closed before a response was received')
        ) {
          return; // Suppress - these are harmless Chrome extension warnings
        }
        originalConsoleError.apply(console, args);
      };

      // Cleanup: restore original console.error on unmount
      return () => {
        console.error = originalConsoleError;
      };
    }
  }, []);

  useEffect(() => {
    // SSR safety check - window is only available in browser
    if (typeof window === "undefined") {
      return;
    }

    const inIframe = window.parent !== window;
    if (!inIframe) return;

    const send = (payload: unknown) => {
      try {
        window.parent.postMessage(payload, "*");
        // Suppress Chrome extension errors - Swiggy Dec 2025 pattern: Silent suppression
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
          // Silently ignore - this is a Chrome extension issue
          // Access lastError to clear it, but don't log
          void chrome.runtime.lastError;
        }
      } catch (error) {
        // Silently handle message port errors (parent window closed, extension errors, etc.)
        // This prevents "runtime.lastError: The message port closed before a response was received"
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Only log if it's not a chrome extension error
        if (
          !errorMessage.includes('runtime.lastError') &&
          !errorMessage.includes('message port closed') &&
          process.env.NODE_ENV === "development"
        ) {
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
    
    try {
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
      // Suppress Chrome extension errors - Swiggy Dec 2025 pattern: Silent suppression
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
        // Silently ignore - this is a Chrome extension issue
        // Access lastError to clear it, but don't log
        void chrome.runtime.lastError;
      }
    } catch (error) {
      // Silently handle message port errors (parent window closed, extension errors, etc.)
      // This prevents "runtime.lastError: The message port closed before a response was received"
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Only log if it's not a chrome extension error
      if (
        !errorMessage.includes('runtime.lastError') &&
        !errorMessage.includes('message port closed') &&
        process.env.NODE_ENV === "development"
      ) {
        logger.debug("[ErrorReporter] postMessage failed", error);
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
