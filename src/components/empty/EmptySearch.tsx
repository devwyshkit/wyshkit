import { Search, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptySearchProps {
  query: string;
  onClear?: () => void;
  suggestions?: string[];
}

/**
 * Empty Search Results State
 * Shown when search returns no results
 * Swiggy Dec 2025 pattern: Helpful empty state with search suggestions
 */
export function EmptySearch({ query, onClear, suggestions = [] }: EmptySearchProps) {
  const trendingSearches = suggestions.length > 0 ? suggestions : [
    "Birthday Gifts",
    "Anniversary Gifts",
    "Custom Cakes",
    "Personalized Mugs",
    "Tech Accessories",
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Search className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">No results found</h2>
        <p className="text-base text-muted-foreground max-w-md">
          We couldn't find anything matching "{query}". Try a different search term or browse our popular categories.
        </p>
      </div>
      
      {trendingSearches.length > 0 && (
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span>Try searching for:</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {trendingSearches.slice(0, 5).map((term) => (
              <Link key={term} href={`/search?q=${encodeURIComponent(term)}`}>
                <Button variant="outline" size="sm" className="text-xs">
                  {term}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {onClear && (
        <Button onClick={onClear} variant="outline">
          <X className="w-4 h-4 mr-2" />
          Clear Search
        </Button>
      )}
    </div>
  );
}
