"use client";

import { toast } from "sonner";

/**
 * Toast notification hook following Swiggy Dec 2025 patterns
 * Simple, practical, no over-engineering
 */
export function useToast() {
  return {
    success: (message: string, description?: string) => {
      toast.success(message, {
        description,
        duration: 3000,
      });
    },
    error: (message: string, description?: string) => {
      toast.error(message, {
        description,
        duration: 4000,
      });
    },
    info: (message: string, description?: string) => {
      toast.info(message, {
        description,
        duration: 3000,
      });
    },
    loading: (message: string) => {
      return toast.loading(message);
    },
    promise: <T,>(
        promise: Promise<T>,
        messages: {
          loading: string;
          success: string | ((data: T) => string);
          error: string | ((error: unknown) => string);
        }
      ) => {
      return toast.promise(promise, {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      });
    },
  };
}




