"use client";

import Image from "next/image";
import React, { useState } from "react";
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
  // Normalize src - handle empty strings, undefined, null
  const normalizedSrc = src && typeof src === 'string' && src.trim() !== '' ? src : null;
  const [imgSrc, setImgSrc] = useState(normalizedSrc || fallbackSrc || '/images/logo.png');
  const [hasError, setHasError] = useState(!normalizedSrc); // Start with error if no valid src

  // Update imgSrc when src prop changes
  React.useEffect(() => {
    const newSrc = src && typeof src === 'string' && src.trim() !== '' ? src : null;
    if (newSrc) {
      setImgSrc(newSrc);
      setHasError(false);
    } else if (fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(false);
    } else {
      setImgSrc('/images/logo.png');
      setHasError(false);
    }
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      if (fallbackSrc) {
        setImgSrc(fallbackSrc);
      } else {
        // Use default fallback
        setImgSrc('/images/logo.png');
      }
    }
  };

  // If no valid src from start or error occurred, show placeholder or fallback
  if ((hasError || !normalizedSrc) && !fallbackSrc && imgSrc === '/images/logo.png') {
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
      alt={alt || ''}
      className={className}
      onError={handleError}
      {...props}
    />
  );
}