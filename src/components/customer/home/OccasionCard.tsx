"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface OccasionCardProps {
  name: string;
  image: string;
  href: string;
}

// Swiggy Dec 2025 pattern: Memoize expensive components to prevent unnecessary re-renders
export const OccasionCard = React.memo(function OccasionCard({ name, image, href }: OccasionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-2 shrink-0",
        "snap-start",
        "active:scale-95 transition-transform duration-150"
      )}
    >
      <div className={cn(
        "relative w-16 h-16 md:w-20 md:h-20",
        "rounded-full overflow-hidden",
        "bg-muted",
        "ring-2 ring-transparent hover:ring-primary/20",
        "transition-all duration-200"
      )}>
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 64px, 80px"
          priority
        />
      </div>
      
      <span className={cn(
        "text-xs font-medium text-center",
        "text-foreground",
        "max-w-[64px] md:max-w-[80px]",
        "line-clamp-1"
      )}>
        {name}
      </span>
    </Link>
  );
});
