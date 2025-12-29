"use client";

import { useCart } from "@/hooks/useCart";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

export function FloatingCart() {
  const { items, totalPrice } = useCart();
  const pathname = usePathname();

  if (items.length === 0 || pathname === "/cart" || pathname === "/orders") return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 z-40 max-w-3xl mx-auto">
      <Link href="/cart">
        <div className="bg-green-600 text-white p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5" />
            <div>
              <p className="text-xs opacity-80">{items.length} item{items.length > 1 ? 's' : ''}</p>
              <p className="font-semibold text-sm">₹{totalPrice.toLocaleString("en-IN")}</p>
            </div>
          </div>
          <span className="font-medium text-sm">View Cart</span>
        </div>
      </Link>
    </div>
  );
}
