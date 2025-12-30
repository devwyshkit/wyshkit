"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  ctaText?: string;
  ctaLink?: string;
}

interface HeroBannerProps {
  slides: HeroSlide[];
  autoRotateInterval?: number; // in milliseconds
}

// Swiggy Dec 2025 pattern: Memoize expensive components to prevent unnecessary re-renders
export const HeroBanner = React.memo(function HeroBanner({ slides, autoRotateInterval = 5000 }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [slides.length, autoRotateInterval]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };


  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];

  return (
    <div className="relative h-40 md:h-48 rounded-xl overflow-hidden group">
      <Image
        src={currentSlide.image}
        alt={currentSlide.title}
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      
      <div className="absolute inset-0 p-4 md:p-6 flex flex-col justify-center">
        {currentSlide.subtitle && (
          <p className="text-white/90 text-xs md:text-sm font-medium mb-1">
            {currentSlide.subtitle}
          </p>
        )}
        <h2 className="text-white text-lg md:text-2xl font-semibold mb-3">
          {currentSlide.title}
        </h2>
        {currentSlide.ctaText && currentSlide.ctaLink && (
          <Link
            href={currentSlide.ctaLink}
            className="inline-block bg-white text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors w-fit"
          >
            {currentSlide.ctaText}
          </Link>
        )}
      </div>

      {/* Simple dots indicator only (Swiggy-style - no manual navigation) */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-1 h-1 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white w-3"
                  : "bg-white/40"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

