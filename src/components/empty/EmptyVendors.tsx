import { Store, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyVendorsProps {
  onBrowseAll?: () => void;
}

/**
 * Empty Vendors State
 * Shown when no vendors are found
 * Swiggy Dec 2025 pattern: Helpful empty state with CTA
 */
export function EmptyVendors({ onBrowseAll }: EmptyVendorsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Store className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground">No partners found</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          We couldn't find any partners in your area. Try adjusting your location or browse all partners.
        </p>
      </div>
      {onBrowseAll ? (
        <Button onClick={onBrowseAll} variant="outline">
          Browse All Partners
        </Button>
      ) : (
        <Link href="/search">
          <Button variant="outline">
            <Search className="w-4 h-4 mr-2" />
            Browse All Partners
          </Button>
        </Link>
      )}
    </div>
  );
}


