"use client";

import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  name: string;
  price: number | string;
  image?: string | null;
  category?: string | null;
  isPersonalizable?: boolean;
  onAdd?: () => void;
  onClick?: () => void;
  className?: string;
}

export function ProductCard({
  name,
  price,
  image,
  category,
  isPersonalizable,
  onAdd,
  onClick,
  className,
}: ProductCardProps) {
  const priceNum = typeof price === "string" ? parseFloat(price) : price;

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-xl border bg-background cursor-pointer",
        "hover:shadow-md transition-shadow duration-200",
        className
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5 mb-1">
          {isPersonalizable && (
            <span className="inline-block w-3.5 h-3.5 border-2 border-primary rounded shrink-0 mt-0.5" />
          )}
          <h3 className="font-semibold text-[15px] leading-tight line-clamp-2 text-foreground">
            {name}
          </h3>
        </div>
        
        <p className="text-base font-bold text-foreground mt-1">
          ₹{priceNum.toLocaleString("en-IN")}
        </p>
        
        {category && (
          <p className="text-[13px] text-muted-foreground mt-1 truncate">
            {category}
          </p>
        )}
      </div>

      <div className="relative w-24 h-24 shrink-0">
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted">
          <ImageWithFallback
            src={image || ""}
            alt={name}
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
        
        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className={cn(
              "absolute -bottom-2 left-1/2 -translate-x-1/2",
              "bg-white text-green-600 font-bold text-sm",
              "px-5 py-1.5 rounded-lg",
              "border-2 border-green-600 shadow-md",
              "hover:bg-green-50 active:scale-95 transition-all"
            )}
          >
            ADD
          </button>
        )}
      </div>
    </div>
  );
}
