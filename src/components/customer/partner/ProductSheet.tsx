"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Drawer } from "vaul";
import { Product, ProductReview } from "@/types/product";
import { Vendor } from "@/types/vendor";
import Image from "next/image";
import { useCart } from "@/hooks/useCart";
import { Check, Minus, Plus, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRouter } from "next/navigation";
import { calculateDeliveryFee } from "@/lib/utils/delivery-zones";
import { appConfig } from "@/lib/config/app";
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
import {
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Swiggy Dec 2025 pattern: Memoize expensive components to prevent unnecessary re-renders
export const ProductSheet = React.memo(function ProductSheet({ product, vendor, open, onOpenChange }: { product: Product; vendor?: Vendor; open: boolean; onOpenChange: (open: boolean) => void }) {
  // Swiggy Dec 2025 pattern: Log when ProductSheet receives open prop changes
  useEffect(() => {
    if (open) {
      logger.debug("[ProductSheet] Sheet opened", { productId: product.id, productName: product.name });
    } else {
      logger.debug("[ProductSheet] Sheet closed", { productId: product.id });
    }
  }, [open, product.id, product.name]);
  
  const { addItem, pendingVendorSwitch, confirmVendorSwitch, cancelVendorSwitch } = useCart();
  const { user } = useAuth();
  const router = useRouter();
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
  
  // Reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Swiggy Dec 2025 pattern: Track previous user ID to prevent infinite loops
  const previousUserIdRef = useRef<string | null>(null);
  
  // Carousel state for dots navigation
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  
  // Swiggy Dec 2025 pattern: Memoize images array to prevent unnecessary recalculations
  const images = useMemo(() => {
    const productImages = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);
    return product.isPersonalizable ? [...productImages, "mockup-preview"] : productImages;
  }, [product.images, product.image, product.isPersonalizable]);
  
  const totalSlides = useMemo(() => images.length, [images]);
  
  useEffect(() => {
    if (!api) return;
    
    setCurrent(api.selectedScrollSnap());
    
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleVariantSelect = (variantId: string, optionId: string) => {
    setSelectedVariants(prev => ({ ...prev, [variantId]: optionId }));
  };

  const handleAdd = () => {
    // Swiggy Dec 2025 pattern: No customization pre-payment - customization happens POST-payment
    // Try to add item - returns false if vendor switch is pending
    const added = addItem(product, selectedAddOns, selectedVariants, undefined);
    
    if (added) {
      // Successfully added - close sheet
      onOpenChange(false);
    }
  };

  const handleBuyNow = () => {
    // Swiggy Dec 2025 pattern: Direct to checkout - add item and navigate
    const added = addItem(product, selectedAddOns, selectedVariants, undefined);
    
    if (added) {
      // Close sheet and navigate to cart/checkout
      onOpenChange(false);
      router.push('/cart');
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
  // Swiggy Dec 2025 pattern: Track open state and product ID to prevent redundant fetches
  const previousOpenRef = useRef(false);
  const fetchedProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !product.id) {
      previousOpenRef.current = open;
      return;
    }

    // Only fetch when sheet opens (transitions from closed to open) AND product changed
    const justOpened = !previousOpenRef.current && open;
    const productChanged = fetchedProductIdRef.current !== product.id;
    
    if (justOpened || productChanged) {
      previousOpenRef.current = open;
      fetchedProductIdRef.current = product.id;

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
    } else {
      previousOpenRef.current = open;
    }
  }, [open, product.id, user]); // user needed for canReview check, but fetch only triggers on open/product change

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
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-2xl h-[80vh] fixed bottom-0 left-0 right-0 z-[100] focus:outline-none max-w-2xl mx-auto overflow-hidden">
          <DialogTitle className="sr-only">{product.name}</DialogTitle>
          <DialogDescription className="sr-only">Product details and options</DialogDescription>
          <div className="mx-auto w-10 h-1 flex-shrink-0 rounded-full bg-muted mt-3" />
          
          {/* Close Button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex-1 overflow-y-auto">
            {/* Image Carousel */}
            <div className="relative aspect-[4/3] bg-muted/30">
              <Carousel className="w-full h-full" setApi={setApi}>
                <CarouselContent className="h-full">
                  {/* Product Images */}
                  {images.map((img, index) => (
                    <CarouselItem key={index} className="h-full pl-0">
                      <div className="relative w-full h-full">
              <Image 
                          src={img}
                          alt={`${product.name} - Image ${index + 1}`}
                fill 
                          sizes="100vw"
                className="object-cover" 
                          priority={index === 0}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                  {/* Mockup Preview Slide (if personalizable) */}
                  {product.isPersonalizable && (
                    <CarouselItem className="h-full pl-0">
                      <div className="relative w-full h-full bg-gradient-to-br from-muted/50 to-muted flex flex-col items-center justify-center p-8">
                        <div className="text-center space-y-3">
                          <p className="text-sm font-medium text-muted-foreground">How your engraving might look</p>
                          <div className="bg-background border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 max-w-xs mx-auto">
                            <p className="text-xs text-muted-foreground italic">Sample Text</p>
                          </div>
                          <p className="text-xs text-muted-foreground">Real mockup shared after payment</p>
                        </div>
                      </div>
                    </CarouselItem>
                  )}
                </CarouselContent>
              </Carousel>
              {/* Carousel Dots Navigation */}
              {totalSlides > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {Array.from({ length: totalSlides }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => api?.scrollTo(index)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        current === index
                          ? "w-6 bg-primary"
                          : "w-1.5 bg-primary/30 hover:bg-primary/50"
                      )}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
              {/* Personalizable Badge */}
              {product.isPersonalizable && (
                <div className="absolute top-3 left-3 z-10">
                  <button
                    className="bg-primary text-primary-foreground text-xs font-medium px-2.5 py-1 rounded-full shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Personalizable badge - shows product supports customization
                    }}
                  >
                    Personalizable
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Key Info Section (Pinned, Always Visible) */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
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
                
                {/* Price with variant adjustments */}
                <p className="text-base font-semibold">₹{unitPrice.toLocaleString("en-IN")}</p>
                
                {/* Vendor Name + Rating + Delivery Time */}
                {vendor && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="font-medium">{vendor.name}</span>
                    <span>•</span>
                    <span>{typeof vendor.rating === 'number' ? vendor.rating.toFixed(1) : vendor.rating}★</span>
                    <span>•</span>
                    <span>{vendor.deliveryTime}</span>
                  </div>
                )}
                
                {/* Delivery Fee */}
                {vendor && (
                  <div className="text-sm text-muted-foreground">
                    {vendor.isHyperlocal 
                      ? `₹${calculateDeliveryFee(5, "local", false)} within ${vendor.distance || "10km"}`
                      : `₹${calculateDeliveryFee(0, "intercity", false)} intercity`
                    }
                  </div>
                )}
                
                {/* Mockup SLA */}
                <div className="text-sm text-muted-foreground">
                  Mockup in {product.mockupSlaHours || appConfig.order.mockupSlaHours} {product.mockupSlaHours === 1 || appConfig.order.mockupSlaHours === 1 ? 'hr' : 'hrs'}
                </div>
                
                {/* Disclosure Banner (Sticky, Yellow Tint) */}
                {product.isPersonalizable && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-900 dark:text-yellow-100">
                    <p className="font-medium mb-1">Post-Payment Personalization:</p>
                    <p>Add text/photo after checkout. Vendor creates & shares real mockup for your approval before crafting. No changes pre-payment to ensure smooth flow.</p>
                  </div>
                )}
                
                {/* Brief Description */}
                <p className="text-sm text-muted-foreground">{product.description}</p>
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
                    {product.addOns.map((addon) => {
                      // Determine disclosure text based on addon name/description
                      const isEngraving = addon.name.toLowerCase().includes('engraving') || addon.name.toLowerCase().includes('text');
                      const isPhoto = addon.name.toLowerCase().includes('photo') || addon.name.toLowerCase().includes('image');
                      const isGiftMessage = addon.name.toLowerCase().includes('gift') || addon.name.toLowerCase().includes('message');
                      
                      let disclosureText = "";
                      if (isEngraving) {
                        disclosureText = "Text collected post-payment; 30 char max";
                      } else if (isPhoto) {
                        disclosureText = "Upload JPEG/PNG post-payment; <5MB";
                      } else if (isGiftMessage) {
                        disclosureText = "150 char max, added post-payment";
                      }
                      
                      return (
                      <button 
                        key={addon.id} 
                        onClick={() => toggleAddOn(addon.id)}
                        className={cn(
                            "flex flex-col items-start w-full px-3 py-2 rounded border text-left",
                          selectedAddOns.includes(addon.id) ? "border-foreground" : "border-border"
                        )}
                      >
                          <div className="flex items-center justify-between w-full">
                        <div>
                          <span className="text-sm">{addon.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">+₹{addon.price}</span>
                        </div>
                        <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                          selectedAddOns.includes(addon.id) ? "bg-foreground border-foreground" : "border-muted-foreground/30"
                        )}>
                          {selectedAddOns.includes(addon.id) && <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />}
                        </div>
                  </div>
                          {disclosureText && (
                            <p className="text-xs text-muted-foreground mt-1">{disclosureText}</p>
                          )}
                        </button>
                      );
                    })}
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

              {/* Compliance Details (Collapsed Accordion) */}
              {(product.hsnCode || product.materialComposition || product.dimensions || product.weightGrams || product.careInstructions || product.warranty || product.countryOfOrigin) && (
                <Accordion type="single" collapsible className="pt-3 border-t">
                  <AccordionItem value="compliance" className="border-none">
                    <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:no-underline">
                      Compliance Details
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-xs">
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
                    {product.manufacturerAddress && (
                      <div>
                        <span className="text-muted-foreground">Manufacturer Address: </span>
                        <span className="font-medium">{product.manufacturerAddress}</span>
                      </div>
                    )}
                  </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          </div>

          {/* Fixed Bottom Bar with Actions */}
          <div className="border-t bg-background p-4 space-y-3 sticky bottom-0 z-10">
            <div className="flex items-center justify-center gap-2">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center border rounded hover:bg-muted transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-medium text-sm">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)}
                className="w-9 h-9 flex items-center justify-center border rounded hover:bg-muted transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
            <Button 
                variant="outline"
                className="flex-1 h-11 rounded-lg font-medium text-sm"
              onClick={handleAdd}
            >
                Add to Cart
              </Button>
              <Button 
                className="flex-1 h-11 rounded-lg font-medium text-sm"
                onClick={handleBuyNow}
              >
                Buy Now - ₹{total.toLocaleString("en-IN")}
            </Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
    </>
  );
});
