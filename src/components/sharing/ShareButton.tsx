"use client";

import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";

interface ShareButtonProps {
  url: string;
  title?: string;
  text?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Share Button Component
 * Uses native Web Share API on mobile, fallback to copy link
 * Swiggy Dec 2025 pattern: Simple share functionality
 */
export function ShareButton({
  url,
  title,
  text,
  className,
  variant = "outline",
  size = "default",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  // Cleanup timer when copied state changes or component unmounts
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${url}` : url;
    const shareText = text || title || "Check this out on WyshKit";
    const shareTitle = title || "WyshKit";

    // Check if Web Share API is available (mobile browsers)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== "AbortError") {
          logger.error("Share failed", error);
        }
        // Fall through to copy link
      }
    }

    // Fallback: Copy link to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
      success("Link copied to clipboard");
    } catch (error) {
      logger.error("Copy failed", error);
      success("Failed to copy link");
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </>
      )}
    </Button>
  );
}


