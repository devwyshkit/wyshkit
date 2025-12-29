import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";

/**
 * Standardized database check
 * Swiggy Dec 2025 pattern: Fail fast if database is not available.
 */
export function checkDatabase(routeName: string): NextResponse | null {
  const { db } = require("@/lib/db");
  if (!db) {
    logger.error(`[API ${routeName}] Database not available`);
    return NextResponse.json(
      {
        error: "Service temporarily unavailable. Please try again in a moment.",
        code: "DATABASE_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
  return null;
}

/**
 * Normalize query parameter from URL
 */
export function normalizeQueryParam(
  param: string | null | undefined
): string | number | boolean | undefined {
  if (param === null || param === undefined) {
    return undefined;
  }
  
  const trimmed = param.trim();
  if (trimmed === "") {
    return undefined;
  }
  
  // Try to parse as number
  if (/^-?\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  
  // Try to parse as boolean
  if (trimmed.toLowerCase() === "true") {
    return true;
  }
  if (trimmed.toLowerCase() === "false") {
    return false;
  }
  
  return trimmed;
}
