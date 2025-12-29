"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { cn } from "@/lib/utils";

interface VendorCardProps {
  id: string;
  name: string;
  image?: string | null;
  rating?: number | string | null;
  description?: string | null;
  city?: string | null;
  isOnline?: boolean;
  className?: string;
}

export function VendorCard({
  id,
  name,
  image,
  rating,
  description,
  city,
  isOnline = true,
  className,
}: VendorCardProps) {
  const ratingNum = typeof rating === "string" ? parseFloat(rating) : rating;
  const displayRating = ratingNum && ratingNum > 0 ? ratingNum.toFixed(1) : null;

  return (
    <Link href={`/partner/${id}`} className={cn("block group", className)}>
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
        <ImageWithFallback
          src={image || ""}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {!isOnline && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-xs font-medium px-3 py-1.5 bg-black/50 rounded-lg">
              Currently Closed
            </span>
          </div>
        )}

        {displayRating && (
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-white text-foreground px-1.5 py-0.5 rounded text-xs font-bold shadow-sm">
            {displayRating}
            <Star className="w-2.5 h-2.5 fill-orange-400 text-orange-400" />
          </div>
        )}
      </div>

      <div className="mt-2.5 px-0.5">
        <h3 className="font-bold text-[15px] leading-tight truncate text-foreground">
          {name}
        </h3>
        <p className="text-[13px] text-muted-foreground truncate mt-0.5">
          {description || city || "Artisan Partner"}
        </p>
      </div>
    </Link>
  );
}
