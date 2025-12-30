"use client";

import { use, useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVendor } from "@/hooks/api/useVendor";
import { Product } from "@/types/product";
import { Star, Clock, MapPin, Search } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { ProductSheet } from "@/components/customer/partner/ProductSheet";
import { FloatingCart } from "@/components/customer/cart/FloatingCart";
import { ProductListSkeleton } from "@/components/skeletons/ProductSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/components/errors/ApiError";
import { NotFound } from "@/components/errors/NotFound";
import { ProductFilters, type ProductFilters as ProductFiltersType } from "@/components/customer/partner/ProductFilters";
import { EmptyProducts } from "@/components/empty/EmptyProducts";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { logger } from "@/lib/utils/logger";

export default function PartnerCatalog({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  // Validate ID before passing to hook
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-32">
        <div className="max-w-5xl mx-auto w-full px-4 py-8">
          <NotFound 
            title="Invalid Partner ID" 
            message="The partner ID provided is invalid."
          />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex flex-col min-h-screen bg-background pb-32">
          <div className="max-w-6xl mx-auto w-full">
            <Skeleton className="h-48 md:h-56 lg:h-64 w-full rounded-none" />
            <div className="px-4 -mt-8 relative z-10">
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <div className="px-4 py-4">
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="px-4">
              <ProductListSkeleton count={6} />
            </div>
          </div>
        </div>
      }>
        <PartnerCatalogContent id={id} />
      </Suspense>
    </ErrorBoundary>
  );
}

function PartnerCatalogContent({ id }: { id: string }) {
  const { vendor, products: vendorProducts, loading, error } = useVendor(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Swiggy Dec 2025 pattern: Track if product sheet has been opened from query param to prevent multiple opens
  const productSheetOpenedFromQueryRef = useRef<string | null>(null);
  
  // Swiggy Dec 2025 pattern: Handle product deep linking from URL query param
  useEffect(() => {
    const productId = searchParams.get('product');
    
    if (productId) {
      logger.debug("[PartnerCatalog] Product query param detected", { productId, vendorId: id });
    }
    
    if (productId && vendorProducts && vendorProducts.length > 0) {
      // Prevent opening the same product multiple times
      if (productSheetOpenedFromQueryRef.current === productId) {
        logger.debug("[PartnerCatalog] Product sheet already opened for this product, skipping", { productId });
        return;
      }
      
      const product = vendorProducts.find(p => p.id === productId);
      
      if (product) {
        logger.info("[PartnerCatalog] Product found, opening sheet", { 
          productId, 
          productName: product.name,
          vendorId: id 
        });
        
        // Set state first
        setSelectedProduct(product);
        setIsSheetOpen(true);
        productSheetOpenedFromQueryRef.current = productId;
        
        // Clean up URL (remove product query param) after a short delay to ensure state updates are processed
        setTimeout(() => {
          const newSearchParams = new URLSearchParams(searchParams.toString());
          newSearchParams.delete('product');
          const newUrl = newSearchParams.toString() 
            ? `?${newSearchParams.toString()}`
            : '';
          // Swiggy Dec 2025 pattern: Fix router.replace path - use correct format
          const targetPath = newUrl ? `/partner/${id}${newUrl}` : `/partner/${id}`;
          logger.debug("[PartnerCatalog] Cleaning up URL query param", { targetPath });
          router.replace(targetPath, { scroll: false });
        }, 100);
      } else {
        logger.warn("[PartnerCatalog] Product not found in vendorProducts", { 
          productId, 
          vendorId: id,
          availableProductIds: vendorProducts.map(p => p.id)
        });
      }
    } else if (productId && (!vendorProducts || vendorProducts.length === 0)) {
      logger.debug("[PartnerCatalog] Product query param present but vendorProducts not loaded yet", { 
        productId, 
        vendorId: id,
        loading 
      });
    }
  }, [searchParams, vendorProducts, router, id, loading]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ProductFiltersType>({
    sort: "relevance",
    personalizableOnly: false,
    inStockOnly: false,
  });

  // Extract available categories from products
  const availableCategories = useMemo(() => {
    if (!vendorProducts || !Array.isArray(vendorProducts)) return [];
    const categories = new Set(vendorProducts.map(p => p?.category).filter(Boolean));
    return Array.from(categories).sort();
  }, [vendorProducts]);

  // Swiggy Dec 2025 pattern: Use primitive values in dependency array to prevent unnecessary re-renders
  // Extract filter values as primitives for stable dependency array
  const filterSort = filters.sort;
  const filterCategory = filters.category;
  const filterPersonalizableOnly = filters.personalizableOnly;
  const filterInStockOnly = filters.inStockOnly;
  const filterPriceRange = filters.priceRange;

  // Filter and sort products
  // Swiggy Dec 2025 pattern: Define filteredProducts BEFORE useEffect that uses it to avoid TDZ error
  // Use primitive filter values in dependency array for stable references
  const filteredProducts = useMemo(() => {
    if (!vendorProducts) return [];

    let filtered = [...vendorProducts];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter(p => p.category === filterCategory);
    }

    // Personalizable filter
    if (filterPersonalizableOnly) {
      filtered = filtered.filter(p => p.isPersonalizable);
    }

    // In stock filter (assuming all products are in stock for now)
    if (filterInStockOnly) {
      // For now, all products are considered in stock
      // filtered = filtered.filter(p => p.inStock);
    }

    // Price range filter
    if (filterPriceRange) {
      filtered = filtered.filter(p =>
        p.price >= filterPriceRange.min && p.price <= filterPriceRange.max
      );
    }

    // Sort
    switch (filterSort) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        break;
      case "relevance":
      default:
        // Keep original order (relevance)
        break;
    }

    return filtered;
  }, [vendorProducts, searchQuery, filterSort, filterCategory, filterPersonalizableOnly, filterInStockOnly, filterPriceRange]);

  // Swiggy Dec 2025 pattern: Debug code removed - use React DevTools for debugging instead

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-32">
        <div className="max-w-6xl mx-auto w-full">
          <Skeleton className="h-48 md:h-56 lg:h-64 w-full rounded-none" />
          <div className="px-4 -mt-8 relative z-10">
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="px-4 py-4">
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="px-4">
            <ProductListSkeleton count={6} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Swiggy Dec 2025 pattern: Show specific error messages for product fetch failures
    const isProductError = error.includes("products") || error.includes("database permissions") || error.includes("Failed to load products");
    
    return (
      <div className="flex flex-col min-h-screen bg-background pb-32">
        <div className="max-w-5xl mx-auto w-full px-4 py-8">
          <ApiError 
            message={error} 
            onRetry={() => {
              // Refetch vendor and products
              router.refresh();
            }} 
          />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-32">
        <div className="max-w-5xl mx-auto w-full px-4 py-8">
          <NotFound 
            title="Partner not found" 
            message="The partner you're looking for doesn't exist or has been removed."
          />
        </div>
      </div>
    );
  }

  // Show empty state if vendor has no products at all
  if (!loading && (!vendorProducts || vendorProducts.length === 0) && !error) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-32">
        <div className="max-w-5xl mx-auto w-full">
          {/* Vendor header */}
          <div className="relative h-48 md:h-56 lg:h-64">
            <ImageWithFallback
              src={vendor.image}
              alt={vendor.name}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          </div>

          <div className="px-4 -mt-8 relative z-10">
            <div className="bg-background rounded-xl p-4 border shadow-sm">
              <h1 className="text-xl md:text-2xl font-bold">{vendor.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{vendor.description || "Artisan Partner"}</p>
            </div>
          </div>

          <div className="px-4 py-8">
            <EmptyProducts
              hasFilters={false}
              onClearFilters={() => {}}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="flex flex-col min-h-screen bg-background pb-32">
      <div className="max-w-5xl mx-auto w-full">
        <div className="relative h-48 md:h-56 lg:h-64">
          <ImageWithFallback src={vendor.image || ""} alt={vendor.name || "Vendor"} fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        <div className="px-4 -mt-8 relative z-10">
          <div className="bg-background rounded-xl p-4 md:p-5 border shadow-sm">
            <h1 className="text-xl md:text-2xl font-bold mb-1">{vendor.name || "Unknown Vendor"}</h1>
            <p className="text-sm text-muted-foreground mb-3">
              {(vendor.tags && Array.isArray(vendor.tags) ? vendor.tags : []).join(" • ")}
            </p>
            
            <div className="flex items-center gap-4 pt-3 border-t text-sm">
              <span className="flex items-center gap-1.5">
                <div className="bg-green-600 text-white px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> {vendor.rating || 0}
                </div>
              </span>
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <Clock className="w-4 h-4" /> {vendor.deliveryTime || "N/A"}
              </span>
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <MapPin className="w-4 h-4" /> {vendor.distance || "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full h-11 bg-muted/50 rounded-xl pl-11 pr-4 text-base outline-none border border-transparent focus:border-primary/20 focus:bg-background transition-colors"
            />
          </div>
        </div>

        <div className="px-4">
          {/* Filters and Sort */}
          <ProductFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableCategories={availableCategories}
          />

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base md:text-lg font-bold text-foreground">Products</h2>
            <span className="text-sm text-muted-foreground font-medium">{filteredProducts.length} items</span>
          </div>

          {filteredProducts.length === 0 ? (
            <EmptyProducts
              hasFilters={!!(filters.category || filters.personalizableOnly || filters.inStockOnly || filters.priceRange || searchQuery.trim())}
              onClearFilters={() => {
                setFilters({
                  sort: filters.sort,
                  personalizableOnly: false,
                  inStockOnly: false,
                });
                setSearchQuery("");
              }}
            />
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id}
                  className="flex gap-4 p-4 border rounded-xl cursor-pointer hover:shadow-md transition-shadow bg-background"
                  onClick={() => {
                    setSelectedProduct(product);
                    setIsSheetOpen(true);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1">{product.name}</h3>
                    <p className="text-lg font-bold text-foreground mb-2">₹{product.price.toLocaleString("en-IN")}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  </div>
                  
                  <div className="relative w-28 h-28 shrink-0">
                    <ImageWithFallback 
                      src={product.image} 
                      alt={product.name} 
                      fill 
                      className="object-cover rounded-xl" 
                    />
                    <button 
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-green-600 font-bold text-sm px-5 py-2 rounded-lg border-2 border-green-600 shadow-lg hover:bg-green-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(product);
                        setIsSheetOpen(true);
                      }}
                      aria-label={`Add ${product.name} to cart`}
                    >
                      ADD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <ProductSheet 
          product={selectedProduct}
          vendor={vendor}
          open={isSheetOpen} 
          onOpenChange={setIsSheetOpen} 
        />
      )}

      <FloatingCart />
    </div>
  );
}

