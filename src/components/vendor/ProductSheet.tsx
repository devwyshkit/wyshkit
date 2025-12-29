"use client";

import { Drawer } from "vaul";
import type { Product } from "@/types/product";
import Image from "next/image";
import { useCart } from "@/hooks/useCart";
import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProductSheet({ product, open, onOpenChange }: { product: Product; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { addItem } = useCart();
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.variants?.forEach(v => {
      initial[v.id] = v.options[0].id;
    });
    return initial;
  });

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleVariantSelect = (variantId: string, optionId: string) => {
    setSelectedVariants(prev => ({ ...prev, [variantId]: optionId }));
  };

  const handleAdd = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product, selectedAddOns);
    }
    onOpenChange(false);
  };

  const variantPriceModifier = product.variants?.reduce((total, variant) => {
    const selectedOptionId = selectedVariants[variant.id];
    const option = variant.options.find(o => o.id === selectedOptionId);
    return total + (option?.priceModifier || 0);
  }, 0) || 0;

  const unitPrice = product.price + variantPriceModifier + (product.addOns?.filter(a => selectedAddOns.includes(a.id)).reduce((sum, a) => sum + a.price, 0) || 0);
  const total = unitPrice * quantity;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-2xl h-[80vh] fixed bottom-0 left-0 right-0 z-50 focus:outline-none max-w-2xl mx-auto overflow-hidden">
          <div className="mx-auto w-10 h-1 flex-shrink-0 rounded-full bg-muted mt-3" />
          
          <div className="flex-1 overflow-y-auto">
            <div className="relative aspect-[4/3] bg-muted/30">
              <Image 
                src={product.image} 
                alt={product.name} 
                fill 
                className="object-cover" 
                priority
              />
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h2 className="text-base font-semibold">{product.name}</h2>
                <p className="text-base font-semibold mt-1">₹{product.price.toLocaleString("en-IN")}</p>
                <p className="text-sm text-muted-foreground mt-2">{product.description}</p>
              </div>

              {product.variants && product.variants.length > 0 && (
                <div className="space-y-3 pt-3 border-t">
                  {product.variants.map((variant) => (
                    <div key={variant.id}>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">{variant.name}</h4>
                      <div className="flex flex-wrap gap-2">
                        {variant.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleVariantSelect(variant.id, option.id)}
                            className={cn(
                              "px-3 py-1.5 rounded text-xs font-medium border",
                              selectedVariants[variant.id] === option.id
                                ? "bg-foreground text-background border-foreground"
                                : "bg-background border-border"
                            )}
                          >
                            {option.name}
                            {option.priceModifier && option.priceModifier > 0 && (
                              <span className="ml-1 opacity-70">+₹{option.priceModifier}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {product.addOns && product.addOns.length > 0 && (
                <div className="pt-3 border-t">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Add-ons</h4>
                  <div className="space-y-2">
                    {product.addOns.map((addon) => (
                      <button 
                        key={addon.id} 
                        onClick={() => toggleAddOn(addon.id)}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2 rounded border text-left",
                          selectedAddOns.includes(addon.id) ? "border-foreground" : "border-border"
                        )}
                      >
                        <div>
                          <span className="text-sm">{addon.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">+₹{addon.price}</span>
                        </div>
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center",
                          selectedAddOns.includes(addon.id) ? "bg-foreground border-foreground" : "border-muted-foreground/30"
                        )}>
                          {selectedAddOns.includes(addon.id) && <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t bg-background p-4 flex items-center gap-3">
            <div className="flex items-center border rounded overflow-hidden">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-medium text-sm">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)}
                className="w-9 h-9 flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <Button 
              className="flex-1 h-10 rounded font-medium text-sm"
              onClick={handleAdd}
            >
              Add item - ₹{total.toLocaleString("en-IN")}
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
