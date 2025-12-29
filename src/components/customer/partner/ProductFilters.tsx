"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type SortOption = "relevance" | "price-low" | "price-high" | "rating";

export interface ProductFilters {
  sort: SortOption;
  category?: string;
  personalizableOnly: boolean;
  inStockOnly: boolean;
  priceRange?: { min: number; max: number };
}

interface ProductFiltersProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  availableCategories?: string[];
}

/**
 * Product filters component following Swiggy Dec 2025 patterns
 * Sort dropdown on left, Filter button on right, applied filters as chips
 */
export function ProductFilters({ filters, onFiltersChange, availableCategories = [] }: ProductFiltersProps) {
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<ProductFilters>(filters);

  const hasActiveFilters = filters.category || filters.personalizableOnly || filters.inStockOnly || filters.priceRange;

  const handleSortChange = (value: string) => {
    const newFilters = { ...filters, sort: value as SortOption };
    onFiltersChange(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsFilterDrawerOpen(false);
  };

  const handleClearFilters = () => {
    const clearedFilters: ProductFilters = {
      sort: filters.sort,
      personalizableOnly: false,
      inStockOnly: false,
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const removeFilter = (key: keyof ProductFilters) => {
    if (key === "sort") return;
    const newFilters = { ...filters };
    if (key === "category") {
      delete newFilters.category;
    } else if (key === "priceRange") {
      delete newFilters.priceRange;
    } else {
      (newFilters[key] as boolean) = false;
    }
    onFiltersChange(newFilters);
  };

  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      {/* Sort Dropdown */}
      <Select value={filters.sort} onValueChange={handleSortChange}>
        <SelectTrigger className="h-9 w-[140px] text-xs">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="relevance">Relevance</SelectItem>
          <SelectItem value="price-low">Price: Low to High</SelectItem>
          <SelectItem value="price-high">Price: High to Low</SelectItem>
          <SelectItem value="rating">Rating: High to Low</SelectItem>
        </SelectContent>
      </Select>

      {/* Applied Filters Chips */}
      {hasActiveFilters && (
        <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {filters.category && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {filters.category}
              <button
                onClick={() => removeFilter("category")}
                className="ml-1.5 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.personalizableOnly && (
            <Badge variant="secondary" className="text-xs shrink-0">
              Personalizable
              <button
                onClick={() => removeFilter("personalizableOnly")}
                className="ml-1.5 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.inStockOnly && (
            <Badge variant="secondary" className="text-xs shrink-0">
              In Stock
              <button
                onClick={() => removeFilter("inStockOnly")}
                className="ml-1.5 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.priceRange && (
            <Badge variant="secondary" className="text-xs shrink-0">
              ₹{filters.priceRange.min}-{filters.priceRange.max}
              <button
                onClick={() => removeFilter("priceRange")}
                className="ml-1.5 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={handleClearFilters}
            className="text-xs text-primary font-medium shrink-0"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsFilterDrawerOpen(true)}
        className={cn(
          "h-9 text-xs shrink-0",
          hasActiveFilters && "border-primary text-primary"
        )}
      >
        <Filter className="w-3.5 h-3.5 mr-1.5" />
        Filters
      </Button>

      {/* Filter Drawer */}
      <Drawer.Root open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
          <Drawer.Content className="bg-background flex flex-col rounded-t-2xl h-[70vh] fixed bottom-0 left-0 right-0 z-[101] outline-none max-w-xl mx-auto">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted mt-3" />
            <div className="p-4 flex-1 overflow-y-auto">
              <h2 className="text-sm font-semibold mb-4">Filters</h2>

              {/* Category Filter */}
              {availableCategories.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3">Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setLocalFilters(prev => ({ ...prev, category: prev.category === cat ? undefined : cat }))}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                          localFilters.category === cat
                            ? "bg-primary text-white border-primary"
                            : "bg-background border-border hover:bg-muted/50"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Personalizable Filter */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.personalizableOnly}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, personalizableOnly: e.target.checked }))}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm">Personalizable only</span>
                </label>
              </div>

              {/* In Stock Filter */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.inStockOnly}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, inStockOnly: e.target.checked }))}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm">In stock only</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsFilterDrawerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleApplyFilters}
              >
                Apply Filters
              </Button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}


