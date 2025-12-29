import { Package, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyProductsProps {
  onClearFilters?: () => void;
  hasFilters?: boolean;
}

/**
 * Empty Products State
 * Shown when no products are found
 * Swiggy Dec 2025 pattern: Helpful empty state with filter suggestions
 */
export function EmptyProducts({ onClearFilters, hasFilters = false }: EmptyProductsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Package className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">No products found</h2>
        <p className="text-base text-muted-foreground max-w-md">
          {hasFilters
            ? "Try adjusting your filters to see more products."
            : "This partner doesn't have any products available right now."}
        </p>
      </div>
      {hasFilters && onClearFilters && (
        <Button onClick={onClearFilters} variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}


