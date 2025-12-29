import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function EmptyOrders() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Package className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">No orders yet</h2>
        <p className="text-base text-muted-foreground max-w-md">
          Your orders will appear here once you place your first order.
        </p>
      </div>
      <Link href="/">
        <Button>
          Start Shopping
        </Button>
      </Link>
    </div>
  );
}


