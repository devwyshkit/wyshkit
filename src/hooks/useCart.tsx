"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Product } from "@/types/product";
import { logger } from "@/lib/utils/logger";

interface CartItem extends Product {
  quantity: number;
  selectedAddOns: string[];
  selectedVariants: Record<string, string>;
  customization?: {
    text?: string;
    photo?: string;
    giftMessage?: string;
  };
}

interface PendingVendorSwitch {
  product: Product;
  selectedAddOns: string[];
  selectedVariants: Record<string, string>;
  customization?: { text?: string; photo?: string; giftMessage?: string };
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, selectedAddOns: string[], selectedVariants?: Record<string, string>, customization?: { text?: string; photo?: string; giftMessage?: string }) => boolean;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  vendorId: string | null;
  totalPrice: number;
  pendingVendorSwitch: PendingVendorSwitch | null;
  confirmVendorSwitch: () => void;
  cancelVendorSwitch: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [pendingVendorSwitch, setPendingVendorSwitch] = useState<PendingVendorSwitch | null>(null);

  useEffect(() => {
    // SSR safety check - localStorage is only available in browser
    if (typeof window === "undefined") {
      return;
    }

    const savedCart = localStorage.getItem("wyshkit-cart");
    if (savedCart) {
      try {
        const { items: savedItems, vendorId: savedVendorId } = JSON.parse(savedCart);
        setItems(savedItems);
        setVendorId(savedVendorId);
      } catch (e) {
        // Silently fail cart parsing - will start with empty cart
        logger.warn("Failed to parse cart", e);
      }
    }
  }, []);

  useEffect(() => {
    // SSR safety check - localStorage is only available in browser
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem("wyshkit-cart", JSON.stringify({ items, vendorId }));
  }, [items, vendorId]);

  // Helper function to check if two cart items are equal (same product + variants + add-ons)
  const areCartItemsEqual = useCallback((item1: CartItem, item2: CartItem): boolean => {
    // Must be same product
    if (item1.id !== item2.id) return false;
    
    // Must have same variants (compare sorted keys and values)
    const variants1Keys = Object.keys(item1.selectedVariants).sort();
    const variants2Keys = Object.keys(item2.selectedVariants).sort();
    if (variants1Keys.length !== variants2Keys.length) return false;
    if (!variants1Keys.every(key => item1.selectedVariants[key] === item2.selectedVariants[key])) return false;
    
    // Must have same add-ons (compare sorted arrays)
    const addOns1 = [...item1.selectedAddOns].sort();
    const addOns2 = [...item2.selectedAddOns].sort();
    if (addOns1.length !== addOns2.length) return false;
    if (!addOns1.every((id, idx) => id === addOns2[idx])) return false;
    
    return true;
  }, []);

  const addItem = useCallback((product: Product, selectedAddOns: string[], selectedVariants: Record<string, string> = {}, customization?: { text?: string; photo?: string; giftMessage?: string }): boolean => {
    if (vendorId && vendorId !== product.vendorId) {
      // Check if there are items in cart - if so, need confirmation
      if (Array.isArray(items) && items.length > 0) {
        // Set pending vendor switch for confirmation dialog
        setPendingVendorSwitch({
          product,
          selectedAddOns,
          selectedVariants,
          customization,
        });
        return false; // Indicates vendor switch pending
      }
      // No items - can switch directly
      setItems([{ ...product, quantity: 1, selectedAddOns, selectedVariants, customization }]);
      setVendorId(product.vendorId);
      return true;
    }

    setItems((prev) => {
      const newItem: CartItem = { ...product, quantity: 1, selectedAddOns, selectedVariants, customization };
      
      // Find existing item with exact same configuration (product + variants + add-ons)
      const existing = prev.find((item) => areCartItemsEqual(item, newItem));
      
      if (existing) {
        // Increment quantity if exact match found
        return prev.map((item) => 
          areCartItemsEqual(item, newItem) ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      
      // Add as new item if no exact match
      return [...prev, newItem];
    });
    setVendorId(product.vendorId);
    return true;
  }, [vendorId, areCartItemsEqual, items]);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const newItems = prev.filter((item) => item.id !== productId);
      if (newItems.length === 0) setVendorId(null);
      return newItems;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setVendorId(null);
    setPendingVendorSwitch(null);
  }, []);

  const confirmVendorSwitch = useCallback(() => {
    if (!pendingVendorSwitch) return;
    
    setItems([{ 
      ...pendingVendorSwitch.product, 
      quantity: 1, 
      selectedAddOns: pendingVendorSwitch.selectedAddOns, 
      selectedVariants: pendingVendorSwitch.selectedVariants, 
      customization: pendingVendorSwitch.customization 
    }]);
    setVendorId(pendingVendorSwitch.product.vendorId);
    setPendingVendorSwitch(null);
  }, [pendingVendorSwitch]);

  const cancelVendorSwitch = useCallback(() => {
    setPendingVendorSwitch(null);
  }, []);

  // Memoize total price calculation
  const totalPrice = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return 0;
    return items.reduce((acc, item) => {
      // Calculate variant price modifiers
      const variantPriceModifier = item.variants?.reduce((total, variant) => {
        const selectedOptionId = item.selectedVariants[variant.id];
        const option = variant.options.find(o => o.id === selectedOptionId);
        return total + (option?.priceModifier || 0);
      }, 0) || 0;
      
      // Calculate add-ons price
      const addOnsPrice = item.addOns?.filter(a => item.selectedAddOns.includes(a.id)).reduce((sum, a) => sum + a.price, 0) || 0;
      
      // Total price per item = base price + variant modifiers + add-ons
      const itemPrice = item.price + variantPriceModifier + addOnsPrice;
      
      return acc + itemPrice * item.quantity;
    }, 0);
  }, [items]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ 
      items, 
      addItem, 
      removeItem, 
      clearCart, 
      vendorId, 
      totalPrice,
      pendingVendorSwitch,
      confirmVendorSwitch,
      cancelVendorSwitch,
    }),
    [items, addItem, removeItem, clearCart, vendorId, totalPrice, pendingVendorSwitch, confirmVendorSwitch, cancelVendorSwitch]
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
