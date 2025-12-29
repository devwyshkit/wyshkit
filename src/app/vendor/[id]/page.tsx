"use client";

import { use, useState } from "react";
import { vendors, products, Product } from "@/lib/data";
import { Star, Clock, MapPin, Search } from "lucide-react";
import Image from "next/image";
import { ProductSheet } from "@/components/vendor/ProductSheet";
import { FloatingCart } from "@/components/cart/FloatingCart";

export default function VendorCatalog({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const vendor = vendors.find((v) => v.id === id);
  const vendorProducts = products.filter((p) => p.vendorId === id);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (!vendor) return <div className="p-8 text-center">Vendor not found</div>;

  const filteredProducts = searchQuery 
    ? vendorProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : vendorProducts;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <div className="max-w-5xl mx-auto w-full">
        <div className="relative h-32 md:h-40">
          <Image src={vendor.image} alt={vendor.name} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        <div className="px-4 -mt-6 relative z-10">
          <div className="bg-background rounded-lg p-3 border">
            <h1 className="text-base font-semibold">{vendor.name}</h1>
            <p className="text-xs text-muted-foreground">{vendor.tags.join(", ")}</p>
            
            <div className="flex items-center gap-3 mt-2 pt-2 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="bg-green-600 text-white px-1 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5">
                  {vendor.rating} <Star className="w-2.5 h-2.5 fill-current" />
                </div>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {vendor.deliveryTime}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {vendor.distance}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in menu"
              className="w-full h-9 bg-muted/50 rounded-lg pl-9 pr-3 text-sm outline-none"
            />
          </div>
        </div>

        <div className="px-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium text-muted-foreground">Menu</h2>
            <span className="text-xs text-muted-foreground">{filteredProducts.length} items</span>
          </div>

          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                className="flex gap-3 p-3 border rounded-lg cursor-pointer"
                onClick={() => {
                  setSelectedProduct(product);
                  setIsSheetOpen(true);
                }}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{product.name}</h3>
                  <p className="text-sm font-semibold mt-0.5">₹{product.price.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                </div>
                
                <div className="relative w-24 h-20 shrink-0">
                  <Image 
                    src={product.image} 
                    alt={product.name} 
                    fill 
                    className="object-cover rounded-lg" 
                  />
                  <button 
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white text-green-600 font-semibold text-xs px-4 py-1 rounded border border-green-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(product);
                      setIsSheetOpen(true);
                    }}
                  >
                    ADD
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductSheet 
          product={selectedProduct} 
          open={isSheetOpen} 
          onOpenChange={setIsSheetOpen} 
        />
      )}

      <FloatingCart />
    </div>
  );
}
