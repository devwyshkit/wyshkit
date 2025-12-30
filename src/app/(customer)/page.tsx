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
import { useTrendingProducts } from "@/hooks/api/useTrendingProducts";
import { ProductCard } from "@/components/customer/product/ProductCard";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

function HomeContent() {
  const [activeCategory, setActiveCategory] = useState("All");
  const router = useRouter();
  
  // Swiggy Dec 2025 pattern: Use direct Supabase hook instead of API route
  const { vendors, loading, error, refetch } = useVendors();
  const { products: trendingProducts, loading: trendingLoading, error: trendingError } = useTrendingProducts(20);

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

  // Swiggy Dec 2025 pattern: Only show vendors that have products (Swiggy pattern - no empty stores)
  // Filter vendors by category and ensure they have products
  // CRITICAL FIX: Only show vendors with products - don't show empty stores even during loading
  const filteredVendors = useMemo(() => {
    // If products are still loading, return empty array (will show skeletons)
    // This prevents showing vendors without products
    if (trendingLoading) {
      return [];
    }
    
    // If no products loaded, don't show any vendors
    if (!trendingProducts || trendingProducts.length === 0) {
      return [];
    }
    
    // Once products are loaded, filter vendors that have products
    const vendorsWithProducts = new Set(trendingProducts.map(p => p.vendorId));
    
    // Filter vendors: must have products AND match category (if not "All")
    return vendors.filter(vendor => {
      // Swiggy Dec 2025 pattern: Only show vendors with products
      if (!vendorsWithProducts.has(vendor.id)) {
        return false;
      }
      
      // Category filter
      if (activeCategory === "All") {
        return true;
      }
      
      const categoryLower = activeCategory.toLowerCase();
      return (
        vendor.description?.toLowerCase().includes(categoryLower) ||
        (Array.isArray(vendor.tags) && vendor.tags.some(tag => tag.toLowerCase().includes(categoryLower)))
      );
    });
  }, [vendors, activeCategory, trendingProducts, trendingLoading]);

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
          {occasions.map((occ, index) => (
            <OccasionCard key={occ.name} {...occ} priority={index === 0} />
          ))}
        </div>
      </section>

      {/* Trending Gifts Section */}
      {/* Swiggy Dec 2025 pattern: Always show section, show empty state if no products */}
      <section className="mt-6">
        <div className="px-4 flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Trending Gifts</h2>
          <Link href="/search" className="text-sm text-primary font-medium flex items-center">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {trendingLoading ? (
          <div className="flex gap-4 overflow-x-auto px-4 pb-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-[280px] h-32 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : trendingError ? (
          <div className="px-4 py-8 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive text-sm mb-2 font-medium">Failed to load products</p>
            <p className="text-muted-foreground text-xs mb-4">{trendingError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Refetch products - SSR safe: only called on client
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : trendingProducts && trendingProducts.length > 0 ? (
          // CRITICAL FIX: Removed redundant !trendingLoading check - if we're here, loading is false
          <div className="flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar snap-x snap-mandatory">
            {trendingProducts.slice(0, 10).map((product) => (
              <div key={product.id} className="flex-shrink-0 w-[280px] snap-start">
                <ProductCard
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  image={product.image}
                  category={product.category}
                  isPersonalizable={product.isPersonalizable}
                  onClick={() => router.push(`/partner/${product.vendorId}?product=${product.id}`)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground">
            <p>No trending products available at the moment.</p>
          </div>
        )}
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

export default function Home() {
  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Unable to load homepage</h1>
          <p className="text-muted-foreground text-sm mb-4">Please refresh the page</p>
          <Button onClick={() => {
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    }>
      <HomeContent />
    </ErrorBoundary>
  );
}
