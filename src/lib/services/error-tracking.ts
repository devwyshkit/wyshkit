/**
 * Error Tracking Service (Sentry)
 * Handles error reporting to Sentry for production debugging
 */

import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/utils/logger";
import { env } from "@/lib/config/env";

let isInitialized = false;

/**
 * Initialize Sentry if DSN is configured
 */
export function initializeErrorTracking() {
  if (isInitialized) {
    return;
  }

  const sentryDsn = env.SENTRY_DSN;

  if (!sentryDsn) {
    logger.debug("[Error Tracking] Sentry not configured (SENTRY_DSN not set)");
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0, // 10% in production, 100% in dev
      debug: env.NODE_ENV === "development",
      beforeSend(event, hint) {
        // Filter out development errors
        if (env.NODE_ENV === "development") {
          // In development, only send critical errors
          if (event.level === "fatal" || event.level === "error") {
            return event;
          }
          return null; // Don't send non-critical errors in development
        }
        return event;
      },
    });

    isInitialized = true;
    logger.info("[Error Tracking] Sentry initialized");
  } catch (error) {
    logger.error("[Error Tracking] Failed to initialize Sentry", error);
  }
}

/**
 * Capture an exception
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!isInitialized) {
    logger.error("[Error Tracking] Error not sent to Sentry (not initialized)", error, context);
    return;
  }

  try {
    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value as Record<string, unknown>);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch (sentryError) {
    logger.error("[Error Tracking] Failed to capture exception", sentryError);
  }
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  if (!isInitialized) {
    logger.log(`[Error Tracking] Message not sent to Sentry (not initialized): ${message}`);
    return;
  }

  try {
    Sentry.captureMessage(message, level);
  } catch (error) {
    logger.error("[Error Tracking] Failed to capture message", error);
  }
}

/**
 * Set user context
 */
export function setUserContext(userId: string, email?: string, phone?: string) {
  if (!isInitialized) {
    return;
  }

  try {
    Sentry.setUser({
      id: userId,
      email,
      username: phone,
    });
  } catch (error) {
    logger.error("[Error Tracking] Failed to set user context", error);
  }
}

/**
 * Clear user context
 */
export function clearUserContext() {
  if (!isInitialized) {
    return;
  }

  try {
    Sentry.setUser(null);
  } catch (error) {
    logger.error("[Error Tracking] Failed to clear user context", error);
  }
}


