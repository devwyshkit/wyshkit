"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Product } from "@/types/product";
import { logger } from "@/lib/utils/logger";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [pendingVendorSwitch, setPendingVendorSwitch] = useState<PendingVendorSwitch | null>(null);
  const hasSyncedRef = useRef(false); // Track if we've synced localStorage to Supabase
  const previousUserIdRef = useRef<string | null>(null); // Track previous user ID to prevent redundant fetches
  const isLoadingRef = useRef(false); // Track if cart is currently loading to prevent save during load
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce save operations
  const syncAttemptedRef = useRef<Set<string>>(new Set()); // Track user sync attempts to prevent repeated API calls

  // Swiggy Dec 2025 pattern: Chrome extension errors are harmless and don't need suppression
  // They occur when browser extensions try to communicate with closed ports
  // Removing suppression hack - let browser handle these warnings naturally

  // Load cart from Supabase (if logged in) or localStorage (if anonymous)
  // Swiggy Dec 2025 pattern: Use stable user ID dependency, prevent redundant fetches
  const userId = user?.id || null;
  
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Only fetch if user ID actually changed - prevent redundant fetches
    if (userId === previousUserIdRef.current) {
      return;
    }
    
    // Update ref before fetching
    previousUserIdRef.current = userId;
    isLoadingRef.current = true; // Mark as loading to prevent save effect from running
    // Reset sync attempts when user changes
    syncAttemptedRef.current.clear();

    const loadCart = async () => {
      try {
        if (userId) {
          // User is logged in - load from Supabase
          const supabase = getSupabaseClient();
          if (!supabase) {
            // Supabase not available - fallback to localStorage
            logger.warn("[Cart] Supabase client not available, loading from localStorage");
            const savedCart = localStorage.getItem("wyshkit-cart");
            if (savedCart) {
              try {
                const { items: savedItems, vendorId: savedVendorId } = JSON.parse(savedCart);
                setItems(savedItems || []);
                setVendorId(savedVendorId || null);
              } catch (e) {
                logger.warn("[Cart] Failed to parse localStorage cart", e);
                setItems([]);
                setVendorId(null);
              }
            } else {
              setItems([]);
              setVendorId(null);
            }
            return;
          }

          try {
            const { data: cartData, error: cartError } = await supabase
              .from('user_carts')
              .select('items, vendor_id')
              .eq('user_id', userId)
              .maybeSingle();

            if (cartError && cartError.code !== 'PGRST116') {
              logger.error("[Cart] Failed to load cart from Supabase", cartError);
              // Fallback to localStorage
              const savedCart = localStorage.getItem("wyshkit-cart");
              if (savedCart) {
                try {
                  const { items: savedItems, vendorId: savedVendorId } = JSON.parse(savedCart);
                  setItems(savedItems || []);
                  setVendorId(savedVendorId || null);
                } catch (e) {
                  logger.warn("[Cart] Failed to parse localStorage cart", e);
                  setItems([]);
                  setVendorId(null);
                }
              } else {
                setItems([]);
                setVendorId(null);
              }
              return;
            }

            if (cartData) {
              // Load from Supabase
              setItems((cartData.items as CartItem[]) || []);
              setVendorId(cartData.vendor_id || null);
            } else {
              // No Supabase cart - check localStorage and sync if exists
              const savedCart = localStorage.getItem("wyshkit-cart");
              if (savedCart && !hasSyncedRef.current) {
                try {
                  const { items: savedItems, vendorId: savedVendorId } = JSON.parse(savedCart);
                  if (savedItems && savedItems.length > 0) {
                    // Sync localStorage cart to Supabase (fire and forget)
                    (async () => {
                      try {
                        const { error: syncError } = await supabase
                          .from('user_carts')
                          .upsert({
                            user_id: userId,
                            items: savedItems,
                            vendor_id: savedVendorId,
                            updated_at: new Date().toISOString(),
                          });
                        
                        if (!syncError) {
                          hasSyncedRef.current = true;
                          // Clear localStorage after sync
                          localStorage.removeItem("wyshkit-cart");
                        } else {
                          logger.warn("[Cart] Failed to sync localStorage cart to Supabase", syncError);
                        }
                      } catch (syncError: unknown) {
                        logger.warn("[Cart] Error syncing localStorage cart to Supabase", syncError);
                      }
                    })();
                    
                    // Set items immediately from localStorage
                    setItems(savedItems);
                    setVendorId(savedVendorId);
                  }
                } catch (e) {
                  logger.warn("[Cart] Failed to sync localStorage cart to Supabase", e);
                }
              } else {
                setItems([]);
                setVendorId(null);
              }
            }
          } catch (error) {
            logger.error("[Cart] Error loading cart from Supabase", error);
            // Fallback to localStorage
            const savedCart = localStorage.getItem("wyshkit-cart");
            if (savedCart) {
              try {
                const { items: savedItems, vendorId: savedVendorId } = JSON.parse(savedCart);
                setItems(savedItems || []);
                setVendorId(savedVendorId || null);
              } catch (e) {
                logger.warn("[Cart] Failed to parse localStorage cart", e);
                setItems([]);
                setVendorId(null);
              }
            } else {
              setItems([]);
              setVendorId(null);
            }
          }
        } else {
          // Anonymous user - load from localStorage
          const savedCart = localStorage.getItem("wyshkit-cart");
          if (savedCart) {
            try {
              const { items: savedItems, vendorId: savedVendorId } = JSON.parse(savedCart);
              setItems(savedItems || []);
              setVendorId(savedVendorId || null);
            } catch (e) {
              logger.warn("[Cart] Failed to parse localStorage cart", e);
              setItems([]);
              setVendorId(null);
            }
          } else {
            setItems([]);
            setVendorId(null);
          }
        }
      } catch (error) {
        logger.error("[Cart] Unexpected error loading cart", error);
        setItems([]);
        setVendorId(null);
      } finally {
        // Mark loading as complete after a small delay to ensure state updates are processed
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 100);
      }
    };

    loadCart();
  }, [userId]); // Use stable userId string instead of user object

  // Save cart to Supabase (if logged in) or localStorage (if anonymous)
  // Swiggy Dec 2025 pattern: Prevent save during load, debounce rapid saves
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Don't save if we're currently loading cart
    if (isLoadingRef.current) {
      return;
    }

    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save operations to prevent rapid-fire saves
    saveTimeoutRef.current = setTimeout(() => {
      const saveCart = async () => {
      try {
        // Always save to localStorage first for fast access
        localStorage.setItem("wyshkit-cart", JSON.stringify({ items, vendorId }));

        if (user?.id) {
          // User is logged in - save to Supabase
          const supabase = getSupabaseClient();
          if (!supabase) {
            logger.warn("[Cart] Supabase client not available, saved to localStorage only");
            return;
          }
          try {
            // Swiggy Dec 2025 pattern: Direct Supabase operations, minimize API calls
            // Try to save cart directly - Supabase RLS will handle permissions
            const { error: saveError } = await supabase
              .from('user_carts')
              .upsert({
                user_id: user.id,
                items: items,
                vendor_id: vendorId,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id',
              });

            if (saveError) {
              // Handle foreign key constraint (user doesn't exist) or RLS errors
              if (saveError.code === '23503' || saveError.code === '42P17' || saveError.code === '42501') {
                // User might not exist - try to create via Supabase first (RLS might allow)
                if (!syncAttemptedRef.current.has(user.id)) {
                  syncAttemptedRef.current.add(user.id);
                  
                  // Try direct Supabase insert first (Swiggy Dec 2025: maximize Supabase usage)
                  const { error: insertError } = await supabase
                    .from('users')
                    .insert({
                      id: user.id,
                      phone: user.phone || `oauth_${user.id}`,
                      email: user.email || null,
                      name: user.name || 'User',
                      role: 'customer',
                    })
                    .select('id')
                    .maybeSingle();

                  // If direct insert fails due to RLS, fall back to API route (last resort)
                  if (insertError && (insertError.code === '42P17' || insertError.code === '42501' || insertError.code === 'PGRST301')) {
                    logger.warn("[Cart] RLS blocked user insert, using API route as fallback", { userId: user.id });
                    try {
                      const { apiClient } = await import("@/lib/api/client");
                      await apiClient.post('/auth/sync-user', {
                        userId: user.id,
                        email: user.email,
                        name: user.name,
                      });
                    } catch (apiError) {
                      logger.error("[Cart] API sync also failed", apiError);
                      // Continue - will retry on next save
                    }
                  }

                  // Retry cart save after user sync attempt
                  const { error: retryError } = await supabase
                    .from('user_carts')
                    .upsert({
                      user_id: user.id,
                      items: items,
                      vendor_id: vendorId,
                      updated_at: new Date().toISOString(),
                    }, {
                      onConflict: 'user_id',
                    });

                  if (retryError) {
                    logger.error("[Cart] Failed to save cart after user sync", retryError);
                    // Fallback to localStorage
                    localStorage.setItem("wyshkit-cart", JSON.stringify({ items, vendorId }));
                  }
                } else {
                  // Already attempted sync - just log and fallback
                  logger.warn("[Cart] User sync already attempted, saving to localStorage only", { userId: user.id });
                  localStorage.setItem("wyshkit-cart", JSON.stringify({ items, vendorId }));
                }
              } else {
                logger.error("[Cart] Failed to save cart to Supabase", saveError);
                // Fallback to localStorage
                localStorage.setItem("wyshkit-cart", JSON.stringify({ items, vendorId }));
              }
            } else {
              // Success - clear sync attempt tracking for this user (they're now synced)
              syncAttemptedRef.current.delete(user.id);
            }
          } catch (error) {
            logger.error("[Cart] Error saving cart to Supabase", error);
            // Already saved to localStorage above, so we're good
          }
        }
        // Anonymous user - already saved to localStorage above
      } catch (error) {
        logger.error("[Cart] Unexpected error saving cart", error);
        // Try to save to localStorage as last resort
        try {
          localStorage.setItem("wyshkit-cart", JSON.stringify({ items, vendorId }));
        } catch (localStorageError) {
          logger.error("[Cart] Failed to save cart to localStorage", localStorageError);
        }
      }
      };

      saveCart();
    }, 150); // Swiggy Dec 2025: 150ms debounce for fast UI feedback

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items, vendorId, user?.id]);

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
