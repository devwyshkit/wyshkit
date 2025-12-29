"use client";

import { cn } from "@/lib/utils";

interface CategoryChipProps {
  name: string;
  isActive: boolean;
  onClick: () => void;
}

export function CategoryChip({ name, isActive, onClick }: CategoryChipProps) {
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
}
