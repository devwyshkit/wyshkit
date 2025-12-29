"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

interface OccasionChipProps {
  name: string;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
}

/**
 * Occasion chip component following Swiggy Dec 2025 patterns
 * Round pill-shaped chip, text-only (no images), same style as CategoryChip
 */
export function OccasionChip({ name, href, isActive = false, onClick }: OccasionChipProps) {
  const className = cn(
    "rounded-full px-4 py-2 text-sm font-medium transition-colors shrink-0",
    isActive
      ? "bg-primary text-white"
      : "border border-border bg-background text-muted-foreground hover:bg-muted/50"
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {name}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {name}
    </button>
  );
}




