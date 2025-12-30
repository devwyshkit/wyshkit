"use client";

import { useState, useMemo } from "react";
import { Search, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { VendorCard } from "@/components/customer/home/VendorCard";
import { OccasionCard } from "@/components/customer/home/OccasionCard";
import { HeroBanner } from "@/components/customer/home/HeroBanner";
import { CategoryChip } from "@/components/customer/home/CategoryChip";
import { Button } from "@/components/ui/button";
import { useVendors } from "@/hooks/api/useVendors";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  
  // Swiggy Dec 2025 pattern: Use direct Supabase hook instead of API route
  const { vendors, loading, error, refetch } = useVendors();

  // Swiggy Dec 2025 pattern: Memoize static data to prevent recreation on every render
  const categories = useMemo(() => ["All", "Ceramics", "Jewelry", "Tech", "Cakes", "Home Decor"], []);

  const occasions = useMemo(() => [
    { name: "Birthday", image: "https://picsum.photos/800/600?random=12", href: "/search?occasion=birthday" },
    { name: "Anniversary", image: "https://picsum.photos/800/600?random=2", href: "/search?occasion=anniversary" },
    { name: "Wedding", image: "https://picsum.photos/800/600?random=13", href: "/search?occasion=wedding" },
    { name: "Housewarming", image: "https://picsum.photos/800/600?random=1", href: "/search?occasion=housewarming" },
  ], []);

  const heroSlides = useMemo(() => [
    {
      id: "1",
      title: "20% off your first order",
      subtitle: "Limited Time Offer",
      image: "https://picsum.photos/800/600?random=1",
      ctaText: "Order Now",
      ctaLink: "/search",
    },
    {
      id: "2", 
      title: "Handcrafted with love",
      subtitle: "Discover Local Artisans",
      image: "https://picsum.photos/800/600?random=2",
      ctaText: "Explore",
      ctaLink: "/search",
    },
  ], []);

  // Swiggy Dec 2025 pattern: Fix broken category filtering - filter vendors by category
  const filteredVendors = useMemo(() => {
    if (activeCategory === "All") {
      return vendors;
    }
    // Filter vendors by category - check description and tags
    return vendors.filter(vendor => {
      const categoryLower = activeCategory.toLowerCase();
      return (
        vendor.description?.toLowerCase().includes(categoryLower) ||
        (Array.isArray(vendor.tags) && vendor.tags.some(tag => tag.toLowerCase().includes(categoryLower)))
      );
    });
  }, [vendors, activeCategory]);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <section className="px-4 pt-3 md:hidden">
        <Link href="/search">
          <div className="flex items-center gap-3 bg-muted/60 rounded-xl px-4 py-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <span className="text-[15px] text-muted-foreground">Search for artisans, gifts...</span>
          </div>
        </Link>
      </section>

      <section className="px-4 mt-4">
        <HeroBanner slides={heroSlides} />
      </section>

      <section className="mt-6">
        <div className="px-4 flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Shop by Occasion</h2>
          <Link href="/search?tab=occasions" className="text-sm text-primary font-medium flex items-center">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar snap-x snap-mandatory">
          {occasions.map((occ) => (
            <OccasionCard key={occ.name} {...occ} />
          ))}
        </div>
      </section>

      <section className="mt-6 px-4">
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
          {categories.map((cat) => (
            <CategoryChip
              key={cat}
              name={cat}
              isActive={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>
      </section>

      <section className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">
            {activeCategory === "All" ? "All Artisans" : activeCategory}
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredVendors.length} partners
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-muted rounded-2xl mb-2" />
                <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <p className="text-foreground font-medium">Unable to load artisans</p>
                <p className="text-muted-foreground text-sm">{error}</p>
              </div>
              <Button onClick={refetch} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-[15px]">No artisans available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredVendors.map((vendor, index) => (
              <VendorCard
                key={vendor.id}
                id={vendor.id}
                name={vendor.name}
                image={vendor.image}
                rating={vendor.rating}
                description={vendor.description}
                city={vendor.city}
                isOnline={vendor.isOnline}
                priority={index < 4} // Priority for first 4 vendor cards (LCP optimization)
              />
            ))}
          </div>
        )}
      </section>

      <section className="px-4 mt-8 mb-4">
        <Link href="/search?q=gift">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">Gift Concierge</h3>
              <p className="text-sm text-muted-foreground">Expert curation for special moments</p>
            </div>
            <ChevronRight className="w-5 h-5 text-primary" />
          </div>
        </Link>
      </section>
    </div>
  );
}
