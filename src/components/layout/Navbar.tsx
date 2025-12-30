"use client";

import { MapPin, Search, ChevronDown, ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useVendor } from "@/hooks/api/useVendor";
import { useLocation } from "@/contexts/LocationContext";
import { searchPlaces, getPlaceDetails, parseAddress, getCurrentLocation, reverseGeocode } from "@/lib/services/google-places";
import { logger } from "@/lib/utils/logger";
import { getLogoUrl } from "@/lib/config/supabase-storage";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { items } = useCart();
  const { location, setLocation } = useLocation();
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<Array<{ placeId: string; description: string; mainText: string; secondaryText: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingGPS, setIsLoadingGPS] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const apiKey = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "") : "";
  
  useEffect(() => {
    if (typeof window !== "undefined" && !apiKey && isLocationOpen) {
      setLocationError("Google Maps API key is not configured. Location services are unavailable.");
    }
  }, [apiKey, isLocationOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || !apiKey) {
      setPredictions([]);
      if (!apiKey && searchQuery.trim()) {
        setLocationError("Google Maps API key not configured");
      } else {
        setLocationError(null);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setLocationError(null);
      try {
        const results = await searchPlaces(searchQuery, apiKey);
        setPredictions(results);
        if (results.length === 0 && searchQuery.trim()) {
          setLocationError("No locations found. Try a different search term.");
        }
      } catch (error) {
        logger.error("[Navbar] Places search failed", error);
        setPredictions([]);
        setLocationError("Failed to search locations. Please try again.");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, apiKey]);

  useEffect(() => {
    if (!isLocationOpen) {
      setSearchQuery("");
      setPredictions([]);
    }
  }, [isLocationOpen]);

  const handlePlaceSelect = async (placeId: string) => {
    if (!apiKey) {
      setLocationError("Google Maps API key not configured");
      return;
    }

    setIsSearching(true);
    setLocationError(null);
    try {
      const details = await getPlaceDetails(placeId, apiKey);
      if (details) {
        const parsed = parseAddress(details);
        setLocation({
          area: parsed.area || parsed.city,
          city: parsed.city,
          lat: parsed.lat,
          lng: parsed.lng,
          placeId: details.placeId,
          formattedAddress: details.formattedAddress,
        });
        setSearchQuery("");
        setPredictions([]);
        setIsLocationOpen(false);
        setLocationError(null);
      } else {
        setLocationError("Failed to get location details. Please try again.");
      }
    } catch (error) {
      logger.error("[Navbar] Place selection failed", error);
      setLocationError("Failed to select location. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!apiKey) {
      setLocationError("Google Maps API key not configured");
      return;
    }

    setIsLoadingGPS(true);
    setLocationError(null);
    try {
      const { lat, lng } = await getCurrentLocation();
      const details = await reverseGeocode(lat, lng, apiKey);
      
      if (details) {
        const parsed = parseAddress(details);
        setLocation({
          area: parsed.area || parsed.city,
          city: parsed.city,
          lat: parsed.lat,
          lng: parsed.lng,
          placeId: details.placeId,
          formattedAddress: details.formattedAddress,
        });
        setIsLocationOpen(false);
        setLocationError(null);
      } else {
        setLocationError("Failed to get address from location. Please try again.");
      }
    } catch (error: unknown) {
      logger.error("[Navbar] GPS location failed", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("not supported")) {
        setLocationError("Location services are not supported in your browser.");
      } else if (errorMessage.includes("permission")) {
        setLocationError("Location permission denied. Please enable location access.");
      } else if (errorMessage.includes("timeout")) {
        setLocationError("Location request timed out. Please try again.");
      } else {
        setLocationError("Failed to get your location. Please try again.");
      }
    } finally {
      setIsLoadingGPS(false);
    }
  };

  const isHome = pathname === "/";
  const isCart = pathname === "/cart";
  const isVendor = pathname.startsWith("/vendor/") || pathname.startsWith("/partner/");
  const isSearch = pathname === "/search";
  
  // Swiggy Dec 2025 pattern: Only call useVendor hook when actually on a vendor page
  // This prevents unnecessary hook calls and potential SSR issues
  const vendorId = isVendor ? pathname.split("/")[2] : null;
  const { vendor, loading: vendorLoading } = useVendor(vendorId);
  const vendorName = vendor?.name || null;

  const getPageTitle = () => {
    if (isVendor) {
      if (vendorName) return vendorName;
      return null;
    }
    if (isCart) return "Cart";
    if (pathname === "/orders") return "Orders";
    if (pathname === "/search") return "Search";
    if (pathname === "/profile") return "Account";
    return null;
  };

  const pageTitle = getPageTitle();
  const logoUrl = getLogoUrl();
  const cartCount = Array.isArray(items) ? items.length : 0;

  return (
    <>
      <header 
        className={cn(
          "sticky top-0 z-40 w-full bg-background transition-shadow duration-200",
          scrolled && "shadow-sm"
        )}
      >
        <div className="px-4 max-w-5xl mx-auto">
          <div className="flex h-14 items-center justify-between gap-3">
            {isHome ? (
              <>
                <button 
                  className="flex items-center gap-2 flex-1 min-w-0 md:hidden"
                  onClick={() => setIsLocationOpen(true)}
                >
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex flex-col items-start leading-tight min-w-0">
                    {location ? (
                      <>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[15px] font-semibold truncate">{location.area}</span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{location.city}</span>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[15px] font-semibold">Select location</span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                        <span className="text-xs text-muted-foreground">Tap to choose</span>
                      </>
                    )}
                  </div>
                </button>

                <Link href="/" className="shrink-0 md:hidden">
                  <Image 
                    src={logoUrl} 
                    alt="WYSHKIT" 
                    width={80} 
                    height={20} 
                    className="h-5 w-auto object-contain"
                    priority
                  />
                </Link>

                {!isCart && (
                  <Link href="/cart" className="relative p-2 md:hidden shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                    {cartCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </Link>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-1 min-w-0 md:hidden">
                  <button onClick={() => router.back()} className="p-2 -ml-2 shrink-0">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className="flex-1 text-center min-w-0">
                    {isVendor && vendorLoading ? (
                      <div className="h-5 w-24 bg-muted rounded animate-pulse mx-auto" />
                    ) : pageTitle ? (
                      <h1 className="text-[15px] font-semibold truncate">{pageTitle}</h1>
                    ) : null}
                  </div>
                </div>

                {!isCart && (
                  <Link href="/cart" className="relative p-2 md:hidden shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                    {cartCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </Link>
                )}
              </>
            )}

            <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
              <Link href="/" className="shrink-0">
                <Image 
                  src={logoUrl} 
                  alt="WYSHKIT" 
                  width={100} 
                  height={25} 
                  className="h-6 w-auto object-contain"
                  priority
                />
              </Link>

              <button 
                className="flex items-center gap-2 ml-4 border-l pl-4 shrink-0"
                onClick={() => setIsLocationOpen(true)}
              >
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="flex flex-col items-start leading-tight">
                  {location ? (
                    <>
                      <div className="flex items-center gap-0.5">
                        <span className="text-sm font-medium">{location.area}</span>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{location.city}</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-0.5">
                        <span className="text-sm font-medium">Select location</span>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">Tap to choose</span>
                    </>
                  )}
                </div>
              </button>

              {!isSearch && (
                <Link href="/search" className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2.5 ml-4 flex-1 max-w-md">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Search for partners, gifts...</span>
                </Link>
              )}
            </div>

            <nav className="hidden md:flex items-center gap-4 shrink-0">
              <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Account
              </Link>
              <Link 
                href="/cart"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                  cartCount > 0 ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ShoppingBag className="w-4 h-4" />
                Cart {cartCount > 0 && `(${cartCount})`}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <Drawer.Root open={isLocationOpen} onOpenChange={setIsLocationOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
          <Drawer.Content 
            className="bg-background flex flex-col rounded-t-2xl h-[60vh] fixed bottom-0 left-0 right-0 z-[101] outline-none max-w-xl mx-auto"
            aria-labelledby="location-drawer-title"
            aria-describedby="location-drawer-description"
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-muted mt-3" />
            
            <div className="p-4 flex-1 overflow-y-auto relative">
              <h2 id="location-drawer-title" className="text-lg font-bold mb-1">Select Location</h2>
              <p id="location-drawer-description" className="text-sm text-muted-foreground mb-4">Find artisans near you</p>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search area, street..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted/50 border rounded-xl py-3 pl-11 pr-4 text-[15px] outline-none focus:ring-2 focus:ring-primary/20"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                )}
              </div>

              {locationError && (
                <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <p className="text-sm text-destructive">{locationError}</p>
                </div>
              )}

              {!apiKey && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-sm text-yellow-700">
                    Location services not available. Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
                  </p>
                </div>
              )}

              {predictions.length > 0 && (
                <div className="absolute top-28 left-4 right-4 bg-background border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                  {predictions.map((pred) => (
                    <button
                      key={pred.placeId}
                      onClick={() => handlePlaceSelect(pred.placeId)}
                      className="w-full p-4 text-left hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                    >
                      <p className="text-[15px] font-medium">{pred.mainText}</p>
                      <p className="text-sm text-muted-foreground">{pred.secondaryText}</p>
                    </button>
                  ))}
                </div>
              )}

              <button 
                onClick={handleUseCurrentLocation}
                disabled={isLoadingGPS || !apiKey}
                className="flex items-center gap-3 w-full text-left p-4 rounded-xl hover:bg-muted/50 mb-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  {isLoadingGPS ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <MapPin className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-[15px] text-primary">Use Current Location</h4>
                  <p className="text-sm text-muted-foreground">
                    {isLoadingGPS ? "Getting location..." : "GPS enabled"}
                  </p>
                </div>
              </button>

              {location && (
                <div className="border-t pt-4">
                  <h5 className="text-sm font-medium text-muted-foreground mb-3">Current</h5>
                  <button 
                    onClick={() => setIsLocationOpen(false)}
                    className="flex items-center gap-3 w-full text-left p-4 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-[15px]">{location.area}</h4>
                      <p className="text-sm text-muted-foreground truncate">{location.formattedAddress || location.city}</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
