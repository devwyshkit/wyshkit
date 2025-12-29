"use client";

import { Drawer } from "vaul";
import { Product, ProductReview } from "@/types/product";
import Image from "next/image";
import { useCart } from "@/hooks/useCart";
import { useState, useEffect, useMemo } from "react";
import { Check, Minus, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/components/sharing/ShareButton";
import { ProductReviews } from "@/components/customer/product/ProductReviews";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { logger } from "@/lib/utils/logger";
import { calculateItemPrice } from "@/lib/utils/pricing";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ProductSheet({ product, open, onOpenChange }: { product: Product; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { addItem, pendingVendorSwitch, confirmVendorSwitch, cancelVendorSwitch } = useCart();
  const { user } = useAuth();
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (Array.isArray(product.variants)) {
      product.variants.forEach(v => {
        if (Array.isArray(v.options) && v.options.length > 0) {
          initial[v.id] = v.options[0].id;
        }
      });
    }
    return initial;
  });
  
  // Customization state
  const [customizationText, setCustomizationText] = useState("");
  const [customizationPhoto, setCustomizationPhoto] = useState<string>("");
  const [giftMessage, setGiftMessage] = useState("");
  
  // Reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleVariantSelect = (variantId: string, optionId: string) => {
    setSelectedVariants(prev => ({ ...prev, [variantId]: optionId }));
  };

  const handleAdd = () => {
    // Build customization object if schema exists and fields are filled
    const customization = product.customizationSchema ? {
      ...(product.customizationSchema.requiresText && customizationText ? { text: customizationText } : {}),
      ...(product.customizationSchema.requiresPhoto && customizationPhoto ? { photo: customizationPhoto } : {}),
      ...(giftMessage ? { giftMessage } : {}),
    } : giftMessage ? { giftMessage } : undefined;
    
    // Only include customization if it has at least one field
    const finalCustomization = customization && Object.keys(customization).length > 0 ? customization : undefined;
    
    // Try to add item - returns false if vendor switch is pending
    const added = addItem(product, selectedAddOns, selectedVariants, finalCustomization);
    
    if (added) {
      // Successfully added - close sheet
      onOpenChange(false);
    }
    // If vendor switch is pending, dialog will show automatically
  };

  // Use consolidated price calculation utility
  const unitPrice = useMemo(() => {
    return calculateItemPrice({
      price: product.price || 0,
      variants: Array.isArray(product.variants) ? product.variants : [],
      addOns: Array.isArray(product.addOns) ? product.addOns : [],
      selectedVariants,
      selectedAddOns,
    });
  }, [product.price, product.variants, product.addOns, selectedVariants, selectedAddOns]);
  
  const total = unitPrice * quantity;

  // Fetch reviews when sheet opens
  useEffect(() => {
    if (!open || !product.id) return;

    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const data = await apiClient.get<{
          reviews: ProductReview[];
          averageRating: number;
          reviewCount: number;
        }>(`/products/${product.id}/reviews`);

        setReviews(data.reviews);
        setAverageRating(data.averageRating);
        setReviewCount(data.reviewCount);

        // Check if user can review (has delivered order for this product)
        if (user) {
          try {
            const canReviewData = await apiClient.get<{ canReview: boolean }>(
              `/products/${product.id}/can-review`
            );
            setCanReview(canReviewData.canReview);
          } catch (error) {
            // If check fails, default to false
            logger.error("[ProductSheet] Failed to check review eligibility", error);
            setCanReview(false);
          }
        } else {
          setCanReview(false);
        }
      } catch (error) {
        logger.error("[ProductSheet] Failed to fetch reviews", error);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [open, product.id, user]);

  return (
    <>
      <AlertDialog open={!!pendingVendorSwitch} onOpenChange={(open) => !open && cancelVendorSwitch()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              You have items from another vendor in your cart. Adding this item will replace them. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelVendorSwitch}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmVendorSwitch(); onOpenChange(false); }}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="text-base font-semibold flex-1">{product.name}</h2>
                  <ShareButton
                    url={`/partner/${product.vendorId}?product=${product.id}`}
                    title={product.name}
                    text={`Check out ${product.name} on WyshKit`}
                    variant="ghost"
                    size="icon"
                    className="shrink-0 -mt-1"
                  />
                </div>
                <p className="text-base font-semibold mt-1">₹{product.price.toLocaleString("en-IN")}</p>
                <p className="text-sm text-muted-foreground mt-2">{product.description}</p>
              </div>

              {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
                <div className="space-y-3 pt-3 border-t">
                  {product.variants.map((variant) => (
                    <div key={variant.id}>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">{variant.name}</h4>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(variant.options) ? variant.options : []).map((option) => (
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

              {product.addOns && Array.isArray(product.addOns) && product.addOns.length > 0 && (
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

              {/* Customization Section */}
              {product.customizationSchema && (
                <div className="pt-3 border-t space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Customization</h4>
                  
                  {product.customizationSchema.requiresText && (
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">
                        Custom Text {product.customizationSchema.maxTextLength ? `(max ${product.customizationSchema.maxTextLength} characters)` : ""}
                      </label>
                      <Textarea
                        value={customizationText}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!product.customizationSchema?.maxTextLength || value.length <= product.customizationSchema.maxTextLength) {
                            setCustomizationText(value);
                          }
                        }}
                        placeholder="Enter your custom text..."
                        className="w-full min-h-[80px] text-sm"
                        maxLength={product.customizationSchema.maxTextLength}
                      />
                      {product.customizationSchema.maxTextLength && (
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                          {customizationText.length}/{product.customizationSchema.maxTextLength}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {product.customizationSchema.requiresPhoto && (
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">
                        Custom Photo URL
                      </label>
                      <input
                        type="url"
                        value={customizationPhoto}
                        onChange={(e) => setCustomizationPhoto(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full h-10 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter a URL to your custom photo
                      </p>
                    </div>
                  )}
                  
                  {/* Gift Message (always available) */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">
                      Gift Message (Optional)
                    </label>
                    <Textarea
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      placeholder="Add a personal message..."
                      className="w-full min-h-[60px] text-sm"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {giftMessage.length}/500
                    </p>
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <ProductReviews
                productId={product.id}
                reviews={reviews}
                averageRating={averageRating}
                reviewCount={reviewCount}
                canReview={canReview}
                onReviewSubmitted={() => {
                  // Refetch reviews after submission
                  const fetchReviews = async () => {
                    try {
                      const data = await apiClient.get<{
                        reviews: ProductReview[];
                        averageRating: number;
                        reviewCount: number;
                      }>(`/products/${product.id}/reviews`);
                      setReviews(data.reviews);
                      setAverageRating(data.averageRating);
                      setReviewCount(data.reviewCount);
                    } catch (error) {
                      logger.error("[ProductSheet] Failed to refetch reviews", error);
                    }
                  };
                  fetchReviews();
                }}
              />

              {/* Product Details / Compliance Info (Collapsed by default) */}
              {(product.hsnCode || product.materialComposition || product.dimensions || product.weightGrams || product.careInstructions || product.warranty || product.countryOfOrigin) && (
                <details className="pt-3 border-t">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <h4 className="text-xs font-medium text-muted-foreground">Product Details</h4>
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 space-y-2 text-xs">
                    {product.hsnCode && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">HSN Code:</span>
                        <span className="font-medium">{product.hsnCode}</span>
                      </div>
                    )}
                    {product.materialComposition && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Material:</span>
                        <span className="font-medium">{product.materialComposition}</span>
                      </div>
                    )}
                    {product.dimensions && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dimensions:</span>
                        <span className="font-medium">{product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} cm</span>
                      </div>
                    )}
                    {product.weightGrams && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="font-medium">{product.weightGrams}g</span>
                      </div>
                    )}
                    {product.careInstructions && (
                      <div>
                        <span className="text-muted-foreground">Care Instructions: </span>
                        <span className="font-medium">{product.careInstructions}</span>
                      </div>
                    )}
                    {product.warranty && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Warranty:</span>
                        <span className="font-medium">{product.warranty}</span>
                      </div>
                    )}
                    {product.countryOfOrigin && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Country of Origin:</span>
                        <span className="font-medium">{product.countryOfOrigin}</span>
                      </div>
                    )}
                    {product.manufacturerName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Manufacturer:</span>
                        <span className="font-medium">{product.manufacturerName}</span>
                      </div>
                    )}
                  </div>
                </details>
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
    </>
  );
}
