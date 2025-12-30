/**
 * Error Classification Utility
 * Swiggy Dec 2025 pattern: Consistent error handling across all API routes
 * Classifies Supabase errors and returns appropriate HTTP status codes
 */

export interface ClassifiedError {
  status: number;
  code: string;
  message: string;
  isRLSError: boolean;
  isNotFound: boolean;
  isServiceUnavailable: boolean;
}

/**
 * Classify Supabase error and return appropriate HTTP status code and message
 */
export function classifySupabaseError(
  error: unknown,
  context?: { vendorId?: string; productId?: string }
): ClassifiedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = (error as any)?.code;
  
  // RLS Permission Errors
  if (
    errorCode === '42501' ||
    errorCode === 'PGRST301' ||
    errorMessage?.toLowerCase().includes('permission') ||
    errorMessage?.toLowerCase().includes('policy') ||
    errorMessage?.toLowerCase().includes('row-level security')
  ) {
    return {
      status: 403,
      code: 'PERMISSION_DENIED',
      message: 'Access denied. The resource may not be available or you may not have permission.',
      isRLSError: true,
      isNotFound: false,
      isServiceUnavailable: false,
    };
  }

  // Not Found Errors
  if (errorCode === 'PGRST116') {
    return {
      status: 404,
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      isRLSError: false,
      isNotFound: true,
      isServiceUnavailable: false,
    };
  }

  // Service Unavailable
  if (
    errorMessage?.includes('timeout') ||
    errorMessage?.includes('ECONNREFUSED') ||
    errorMessage?.includes('ENOTFOUND') ||
    errorMessage?.includes('network') ||
    errorMessage?.includes('connection')
  ) {
    return {
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service temporarily unavailable. Please try again later.',
      isRLSError: false,
      isNotFound: false,
      isServiceUnavailable: true,
    };
  }

  // Default to 500 for unexpected errors
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again later.',
    isRLSError: false,
    isNotFound: false,
    isServiceUnavailable: false,
  };
}

/**
 * Check if error is a Supabase RLS error
 */
export function isRLSError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = (error as any)?.code;
  
  return (
    errorCode === '42501' ||
    errorCode === 'PGRST301' ||
    errorMessage?.toLowerCase().includes('permission') ||
    errorMessage?.toLowerCase().includes('policy') ||
    errorMessage?.toLowerCase().includes('row-level security')
  );
}

/**
 * Check if error is a not found error
 */
export function isNotFoundError(error: unknown): boolean {
  const errorCode = (error as any)?.code;
  return errorCode === 'PGRST116';
}

/**
 * Check if error is a service unavailable error
 */
export function isServiceUnavailableError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return (
    errorMessage?.includes('timeout') ||
    errorMessage?.includes('ECONNREFUSED') ||
    errorMessage?.includes('ENOTFOUND') ||
    errorMessage?.includes('network') ||
    errorMessage?.includes('connection')
  );
}

