import { Skeleton } from "@/components/ui/skeleton";

export function VendorSkeleton() {
  return (
    <div className="group cursor-pointer">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2">
        <Skeleton className="w-full h-full" />
      </div>
      <Skeleton className="h-4 w-3/4 mb-1" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function VendorListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <VendorSkeleton key={i} />
      ))}
    </div>
  );
}




