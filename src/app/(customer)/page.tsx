"use client";

import { useState, useEffect } from "react";
import { Search, ChevronRight } from "lucide-react";
import Link from "next/link";
import { VendorCard } from "@/components/customer/home/VendorCard";
import { OccasionCard } from "@/components/customer/home/OccasionCard";
import { HeroBanner } from "@/components/customer/home/HeroBanner";
import { CategoryChip } from "@/components/customer/home/CategoryChip";
import type { Vendor } from "@/types/vendor";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vendors")
      .then((res) => res.json())
      .then((data) => {
        setVendors(data.vendors || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = ["All", "Ceramics", "Jewelry", "Tech", "Cakes", "Home Decor"];

  const occasions = [
    { name: "Birthday", image: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=200&h=200&fit=crop", href: "/search?occasion=birthday" },
    { name: "Anniversary", image: "https://images.unsplash.com/photo-1522673607200-1648482ce486?w=200&h=200&fit=crop", href: "/search?occasion=anniversary" },
    { name: "Wedding", image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=200&h=200&fit=crop", href: "/search?occasion=wedding" },
    { name: "Housewarming", image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200&h=200&fit=crop", href: "/search?occasion=housewarming" },
  ];

  const heroSlides = [
    {
      id: "1",
      title: "20% off your first order",
      subtitle: "Limited Time Offer",
      image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&h=400&fit=crop",
      ctaText: "Order Now",
      ctaLink: "/search",
    },
    {
      id: "2", 
      title: "Handcrafted with love",
      subtitle: "Discover Local Artisans",
      image: "https://images.unsplash.com/photo-1522673607200-1648482ce486?w=800&h=400&fit=crop",
      ctaText: "Explore",
      ctaLink: "/search",
    },
  ];

  const filteredVendors = activeCategory === "All" 
    ? vendors 
    : vendors;

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
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-[15px]">No artisans available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredVendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                id={vendor.id}
                name={vendor.name}
                image={vendor.image}
                rating={vendor.rating}
                description={vendor.description}
                city={vendor.city}
                isOnline={vendor.isOnline}
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
