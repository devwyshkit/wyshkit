"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// Prevent static generation for pages using useSearchParams
export const dynamic = 'force-dynamic';
import { Search, X, Clock, TrendingUp, Star, ChevronRight } from "lucide-react";
import { useSearch } from "@/hooks/api/useSearch";
import { useVendors } from "@/hooks/api/useVendors";
import { OccasionCard } from "@/components/customer/home/OccasionCard";
import { EmptySearch } from "@/components/empty/EmptySearch";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import Link from "next/link";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/utils/logger";

function SearchContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const initialOccasion = searchParams.get('occasion') || undefined;
  const activeTab = searchParams.get('tab') || null;
  const [query, setQuery] = useState(initialQuery);
  const isUpdatingFromUrl = useRef(false);

  const { vendors: searchVendors, products: searchProducts, loading: searchLoading, search: performSearch } = useSearch(initialQuery, initialOccasion);
  const { vendors: popularVendors } = useVendors({ limit: 5 });

  // Occasions data (same as home page)
  const occasions = [
    { 
      name: "Birthday",
      image: "https://picsum.photos/800/600?random=7",
      href: "/search?occasion=birthday"
    },
    { 
      name: "Anniversary",
      image: "https://picsum.photos/800/600?random=14",
      href: "/search?occasion=anniversary"
    },
    { 
      name: "Wedding",
      image: "https://picsum.photos/800/600?random=13",
      href: "/search?occasion=wedding"
    },
    { 
      name: "Baby Shower",
      image: "https://picsum.photos/800/600?random=15",
      href: "/search?occasion=baby-shower"
    },
    { 
      name: "Valentine's Day",
      image: "https://picsum.photos/800/600?random=14",
      href: "/search?occasion=valentine"
    },
    { 
      name: "Mother's Day",
      image: "https://picsum.photos/800/600?random=2",
      href: "/search?occasion=mothers-day"
    },
  ];

  // Load recent searches from Supabase (if logged in) or localStorage (if anonymous)
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const RECENT_SEARCHES_KEY = "wyshkit-recent-searches";
  const MAX_RECENT_SEARCHES = 5;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const loadRecentSearches = async () => {
      if (user?.id) {
        // User is logged in - load from Supabase
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const { data: searchHistory, error: historyError } = await supabase
              .from('user_search_history')
              .select('search_term')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(MAX_RECENT_SEARCHES);

            if (!historyError && searchHistory) {
              const searches = searchHistory.map(s => s.search_term);
              setRecentSearches(searches);

              // Sync localStorage if it has different searches
              const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
              if (saved) {
                try {
                  const localSearches = JSON.parse(saved);
                  // Merge and sync any new searches from localStorage
                  const merged = [...new Set([...searches, ...localSearches])].slice(0, MAX_RECENT_SEARCHES);
                  if (merged.length > searches.length) {
                    // Insert new searches from localStorage
                    for (const term of merged) {
                      if (!searches.includes(term)) {
                        await supabase
                          .from('user_search_history')
                          .insert({ user_id: user.id, search_term: term });
                      }
                    }
                    setRecentSearches(merged);
                  }
                  localStorage.removeItem(RECENT_SEARCHES_KEY); // Clear after sync
                } catch (e) {
                  // Swiggy Dec 2025 pattern: Log parse errors for debugging
                  if (process.env.NODE_ENV === 'development') {
                    logger.debug("[Search] Parse error (non-critical)", e);
                  }
                }
              }
            } else {
              // Fallback to localStorage
              const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
              if (saved) {
                try {
                  setRecentSearches(JSON.parse(saved));
                } catch (e) {
                  // Swiggy Dec 2025 pattern: Log parse errors for debugging
                  if (process.env.NODE_ENV === 'development') {
                    logger.debug("[Search] Parse error (non-critical)", e);
                  }
                }
              }
            }
          } catch (error) {
            logger.error("[Search] Error loading search history", error);
            // Fallback to localStorage
            const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (saved) {
              try {
                setRecentSearches(JSON.parse(saved));
              } catch (e) {
                // Swiggy Dec 2025 pattern: Log parse errors for debugging
                if (process.env.NODE_ENV === 'development') {
                  logger.debug("[Search] Parse error (non-critical)", e);
                }
              }
            }
          }
        }
      } else {
        // Anonymous user - load from localStorage
        try {
          const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
          if (saved) {
            setRecentSearches(JSON.parse(saved));
          }
        } catch (e) {
          // Swiggy Dec 2025 pattern: Log parse errors for debugging
          if (process.env.NODE_ENV === 'development') {
            logger.debug("[Search] Parse error (non-critical)", e);
          }
        }
      }
    };

    loadRecentSearches();
  }, [user?.id]);

  const addToRecentSearches = async (term: string) => {
    if (!term.trim()) return;
    
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      return updated;
    });

    // Save to Supabase (if logged in) or localStorage (if anonymous)
    if (user?.id) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { error: insertError } = await supabase
            .from('user_search_history')
            .insert({ user_id: user.id, search_term: term });

          if (insertError) {
            logger.error("[Search] Failed to save search history", insertError);
            // Fallback to localStorage
            if (typeof window !== "undefined") {
              localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([term, ...recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT_SEARCHES)));
            }
          }
        } catch (error) {
          logger.error("[Search] Error saving search history", error);
          // Fallback to localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([term, ...recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT_SEARCHES)));
          }
        }
      }
    } else {
      // Anonymous user - save to localStorage
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([term, ...recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT_SEARCHES)));
        }
      } catch (e) {
        // Swiggy Dec 2025 pattern: Log storage errors for debugging
        if (process.env.NODE_ENV === 'development') {
          logger.debug("[Search] Storage error (non-critical)", e);
        }
      }
    }
  };

  // Remove trending section (not available from API)
  const trending: string[] = [];

  const hasResults = (
    (Array.isArray(searchVendors) && searchVendors.length > 0) || 
    (Array.isArray(searchProducts) && searchProducts.length > 0)
  ) && (query.length > 0 || initialOccasion);

  // Sync URL when query changes (debounced) - only from user input
  useEffect(() => {
    if (isUpdatingFromUrl.current) {
      isUpdatingFromUrl.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const urlQuery = searchParams.get('q') || '';
      const urlOccasion = searchParams.get('occasion') || '';
      const urlTab = searchParams.get('tab') || '';
      
      // Only update URL if query state differs from URL (user typed something)
      if (query !== urlQuery) {
        const params = new URLSearchParams();
        if (query.trim()) {
          params.set('q', query.trim());
        }
        // Preserve occasion and tab parameters
        if (urlOccasion) params.set('occasion', urlOccasion);
        if (urlTab) params.set('tab', urlTab);
        
        const newUrl = params.toString() ? `/search?${params.toString()}` : '/search';
        router.replace(newUrl, { scroll: false });
        performSearch(query.trim() || undefined, urlOccasion || undefined);
        if (query.trim()) {
          addToRecentSearches(query.trim());
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, router, searchParams, performSearch]);

  // Update query state and trigger search when URL changes (back/forward navigation or direct link)
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    const urlOccasion = searchParams.get('occasion') || '';
    
    if (urlQuery !== query || urlOccasion !== (initialOccasion || '')) {
      isUpdatingFromUrl.current = true;
      setQuery(urlQuery);
      if (urlQuery.trim() || urlOccasion) {
        performSearch(urlQuery.trim() || undefined, urlOccasion || undefined);
      }
    }
  }, [searchParams, query, performSearch]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-3xl mx-auto">
        <div className="sticky top-14 z-20 bg-background px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search partners or products..."
              className="w-full h-11 bg-muted/40 rounded-xl pl-11 pr-12 text-base outline-none border border-transparent focus:border-primary/20 focus:bg-background transition-colors"
              autoFocus
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-4">
          {/* Occasions Tab View */}
          {activeTab === 'occasions' && !query && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base md:text-lg font-bold text-foreground">
                  Browse by Occasion
                </h2>
              </div>
              <div className={cn(
                "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 md:gap-6"
              )}>
                {occasions.map((occ) => (
                  <OccasionCard
                    key={occ.name}
                    name={occ.name}
                    image={occ.image}
                    href={occ.href}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Default View: Recent searches, trending, popular partners */}
          {!query && !activeTab && (
            <div className="space-y-6">
              {recentSearches.length > 0 && (
                <div>
                  <h3 className="text-base md:text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" /> Recent
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.length > 0 ? (
                      recentSearches.map((term) => (
                        <button 
                          key={term}
                          onClick={() => setQuery(term)}
                          className="px-3 py-1.5 bg-muted/40 rounded-full text-xs font-medium"
                          aria-label={`Search for ${term}`}
                        >
                          {term}
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No recent searches</p>
                    )}
                  </div>
                </div>
              )}

              {trending.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" /> Trending
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trending.map((term) => (
                      <button 
                        key={term}
                        onClick={() => setQuery(term)}
                        className="px-3 py-1.5 bg-muted/40 rounded-full text-xs font-medium"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

                  <div>
                    <h3 className="text-base md:text-lg font-bold text-foreground mb-4">Popular Partners</h3>
                    <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                      {(popularVendors && Array.isArray(popularVendors) ? popularVendors.slice(0, 5) : []).map((vendor) => (
                    <Link key={vendor.id} href={`/partner/${vendor.id}`} className="shrink-0 block">
                      <div className="flex flex-col items-center gap-1.5 w-16">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden pointer-events-none">
                          <ImageWithFallback src={vendor.image || ""} alt={vendor.name || "Vendor"} fill sizes="56px" className="object-cover" />
                        </div>
                        <span className="text-[10px] font-medium text-center truncate w-full pointer-events-none">
                          {vendor.name ? vendor.name.split(' ')[0] : ""}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Show results when query or occasion is present */}
          {(query || initialOccasion) && !hasResults && !searchLoading && (
            <EmptySearch query={query || initialOccasion || ""} onClear={() => {
              setQuery("");
              router.replace('/search', { scroll: false });
            }} />
          )}

          {searchLoading && (query || initialOccasion) && (
            <div className="text-center py-8 text-sm text-muted-foreground">Searching...</div>
          )}
          
          {(query || initialOccasion) && hasResults && !searchLoading && (
                <div className="space-y-6">
                  {/* Show active filter badge if occasion is present */}
                  {initialOccasion && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-medium text-muted-foreground">Filtered by:</span>
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium capitalize">
                        {occasions.find(o => o.href.includes(initialOccasion))?.name || initialOccasion}
                      </span>
                      <button
                        onClick={() => {
                          const params = new URLSearchParams();
                          if (query) params.set('q', query);
                          const newUrl = params.toString() ? `/search?${params.toString()}` : '/search';
                          router.replace(newUrl, { scroll: false });
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {searchVendors && Array.isArray(searchVendors) && searchVendors.length > 0 && (
                    <div>
                      <h3 className="text-base md:text-lg font-bold text-foreground mb-4">Partners</h3>
                      <div className="divide-y border rounded-xl overflow-hidden">
                        {searchVendors.map((vendor) => (
                      <Link key={vendor.id} href={`/partner/${vendor.id}`} className="block">
                        <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 pointer-events-none">
                            <ImageWithFallback src={vendor.image || ""} alt={vendor.name || "Vendor"} fill sizes="40px" className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 pointer-events-none">
                            <h4 className="font-semibold text-base">{vendor.name || "Unknown Vendor"}</h4>
                            <p className="text-sm text-muted-foreground">
                              {vendor.deliveryTime || "N/A"} - {vendor.distance || "N/A"}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 text-xs font-medium text-green-600 pointer-events-none">
                            <Star className="w-3 h-3 fill-current" /> {vendor.rating || 0}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {searchProducts && Array.isArray(searchProducts) && searchProducts.length > 0 && (
                <div>
                  <h3 className="text-base md:text-lg font-bold text-foreground mb-4">Products</h3>
                  <div className="divide-y border rounded-xl overflow-hidden">
                    {searchProducts.map((product) => (
                      <Link key={product.id} href={`/partner/${product.vendorId}`} className="block">
                        <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 pointer-events-none">
                            <ImageWithFallback src={product.image || ""} alt={product.name || "Product"} fill sizes="40px" className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 pointer-events-none">
                            <h4 className="font-semibold text-base">{product.name || "Unknown Product"}</h4>
                            <p className="text-sm text-muted-foreground">{product.category || ""}</p>
                          </div>
                          <span className="font-bold text-lg pointer-events-none">₹{(product.price || 0).toLocaleString("en-IN")}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading search...</div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
