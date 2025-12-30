"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CategoryChipProps {
  name: string;
  isActive: boolean;
  onClick: () => void;
}

// Swiggy Dec 2025 pattern: Memoize expensive components to prevent unnecessary re-renders
export const CategoryChip = React.memo(function CategoryChip({ name, isActive, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-all shrink-0",
        "active:scale-95",
        isActive
          ? "bg-foreground text-background"
          : "border border-border bg-background text-muted-foreground hover:border-foreground/30"
      )}
    >
      {name}
    </button>
  );
});
