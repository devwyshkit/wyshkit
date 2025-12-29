"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageWithFallbackProps extends React.ComponentProps<typeof Image> {
  fallbackSrc?: string;
  fallbackClassName?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackSrc,
  fallbackClassName,
  ...props
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      if (fallbackSrc) {
        setImgSrc(fallbackSrc);
      }
    }
  };

  // If error occurred and no fallback src, show placeholder
  if (hasError && !fallbackSrc) {
    // Filter out Next.js Image-specific props that shouldn't be on a div
    const { fill, sizes, priority, quality, placeholder, blurDataURL, ...divProps } = props as any;
    
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center",
          className
        )}
        {...divProps}
      >
        <ImageIcon className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
}

