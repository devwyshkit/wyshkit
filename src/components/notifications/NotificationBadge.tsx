"use client";

import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count?: number;
  showDot?: boolean;
  className?: string;
}

/**
 * Notification badge component following Swiggy Dec 2025 patterns
 * Red badge with white count text, or red dot if no count
 */
export function NotificationBadge({ count, showDot = false, className }: NotificationBadgeProps) {
  // Don't show badge if count is 0 or undefined and not showing dot
  if (!showDot && (!count || count === 0)) {
    return null;
  }

  // Show dot if showDot is true or count is undefined but we want to show something
  if (showDot && !count) {
    return (
      <span
        className={cn(
          "absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background",
          className
        )}
        aria-label="New notification"
      />
    );
  }

  // Show count badge
  const displayCount = count && count > 99 ? "99+" : count;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center px-1 border-2 border-background",
        className
      )}
      aria-label={`${displayCount} notifications`}
    >
      {displayCount}
    </span>
  );
}




