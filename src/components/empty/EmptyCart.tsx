import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground">Your cart is empty</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Add some amazing products from our partners to get started!
        </p>
      </div>
      <Link href="/">
        <Button>
          Browse Partners
        </Button>
      </Link>
    </div>
  );
}


