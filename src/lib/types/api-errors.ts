/**
 * API Error Types and Utilities
 * Standardized error handling for API routes
 * Swiggy Dec 2025 pattern: Type-safe error handling
 */

import { AuthError } from "@/lib/auth/server";
import { ApiClientError } from "@/lib/api/client";

/**
 * Structured API error response
 */
export interface ApiError {
  message: string;
  status?: number;
  details?: Array<{ message: string; path?: string }> | unknown;
  error?: string;
}

/**
 * Type guard to check if error is an ApiError object
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ApiError).message === "string"
  );
}

/**
 * Type guard to check if error is an AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Type guard to check if error is an ApiClientError
 */
export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

/**
 * Type guard to check if error has a status property (for NextResponse errors)
 */
export function isErrorWithStatus(error: unknown): error is { status: number; message?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isApiError(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

/**
 * Extract error status from unknown error
 */
export function getErrorStatus(error: unknown): number {
  if (isAuthError(error)) {
    return error.status || 401;
  }
  if (isApiClientError(error)) {
    return error.status;
  }
  if (isErrorWithStatus(error)) {
    return error.status;
  }
  if (isApiError(error) && error.status) {
    return error.status;
  }
  return 500;
}

/**
 * Format error for API response
 */
export function formatApiError(error: unknown): {
  error: string;
  details?: Array<{ message: string; path?: string }>;
} {
  const message = getErrorMessage(error);
  
  // Extract details if available
  let details: Array<{ message: string; path?: string }> | undefined;
  
  if (isApiError(error) && error.details) {
    if (Array.isArray(error.details)) {
      details = error.details;
    }
  }
  
  if (isApiClientError(error) && error.details) {
    if (typeof error.details === "object" && error.details !== null) {
      const detailsObj = error.details as { details?: Array<{ message?: string; path?: string }> };
      if (Array.isArray(detailsObj.details)) {
        details = detailsObj.details.map((d) => ({
          message: d.message || "Validation error",
          path: d.path,
        }));
      }
    }
  }
  
  return {
    error: message,
    ...(details && details.length > 0 ? { details } : {}),
  };
}

/**
 * Check if error is a validation error (400 status)
 */
export function isValidationError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 400;
}

/**
 * Check if error is an authentication error (401 status)
 */
export function isAuthenticationError(error: unknown): boolean {
  return isAuthError(error) || getErrorStatus(error) === 401;
}

/**
 * Check if error is an authorization error (403 status)
 */
export function isAuthorizationError(error: unknown): boolean {
  return getErrorStatus(error) === 403;
}

/**
 * Check if error is a server error (5xx status)
 */
export function isServerError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status >= 500 && status < 600;
}


