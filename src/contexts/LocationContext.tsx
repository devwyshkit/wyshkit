"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/utils/logger";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Location {
  area: string; // "Indiranagar"
  city: string; // "Bangalore"
  lat: number;
  lng: number;
  placeId?: string;
  formattedAddress?: string;
}

interface LocationContextType {
  location: Location | null;
  setLocation: (location: Location) => void;
  isLoading: boolean;
  error: string | null;
}

const defaultLocationContext: LocationContextType = {
  location: null,
  setLocation: () => {
    // No-op during SSR
    if (typeof window !== "undefined") {
      logger.warn("[Location] setLocation called before LocationProvider is mounted");
    }
  },
  isLoading: false,
  error: null,
};

const LocationContext = createContext<LocationContextType>(defaultLocationContext);

const STORAGE_KEY = "wyshkit-location";

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location, setLocationState] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load location from Supabase (if logged in) or localStorage (if anonymous)
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const loadLocation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (user?.id) {
          // User is logged in - load from Supabase users.city
          const supabase = getSupabaseClient();
          if (!supabase) {
            // Supabase not available - fallback to localStorage
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                setLocationState(parsed);
              } catch (e) {
                logger.warn("[Location] Failed to parse saved location", e);
              }
            }
            setIsLoading(false);
            return;
          }

          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('city')
              .eq('id', user.id)
              .single();

            if (!userError && userData?.city) {
              // Try to load full location from localStorage if available
              const saved = localStorage.getItem(STORAGE_KEY);
              if (saved) {
                try {
                  const parsed = JSON.parse(saved);
                  if (parsed.city === userData.city) {
                    setLocationState(parsed);
                  }
                } catch (e) {
                  // Swiggy Dec 2025 pattern: Log parse errors for debugging
                  if (process.env.NODE_ENV === 'development') {
                    logger.debug("[LocationContext] Parse error (non-critical)", e);
                  }
                }
              }
            } else {
              // No city in database - check localStorage
              const saved = localStorage.getItem(STORAGE_KEY);
              if (saved) {
                try {
                  const parsed = JSON.parse(saved);
                  setLocationState(parsed);
                  // Sync to database (don't await - fire and forget)
                  if (parsed.city) {
                    supabase
                      .from('users')
                      .update({ city: parsed.city })
                      .eq('id', user.id)
                      .catch((syncError) => {
                        logger.warn("[Location] Failed to sync location to Supabase", syncError);
                      });
                  }
                } catch (e) {
                  logger.warn("[Location] Failed to parse saved location", e);
                }
              }
            }
          } catch (error) {
            logger.error("[Location] Error loading location from Supabase", error);
            // Fallback to localStorage
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                setLocationState(parsed);
              } catch (e) {
                logger.warn("[Location] Failed to parse saved location", e);
              }
            }
          }
        } else {
          // Anonymous user - load from localStorage
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setLocationState(parsed);
            } catch (e) {
              logger.warn("[Location] Failed to parse saved location", e);
            }
          }
        }
      } catch (error) {
        logger.error("[Location] Unexpected error loading location", error);
        setError("Failed to load location");
      } finally {
        setIsLoading(false);
      }
    };

    loadLocation();
  }, [user?.id]);

  // Save location to Supabase (if logged in) or localStorage (if anonymous)
  const setLocation = useCallback(async (newLocation: Location) => {
    setLocationState(newLocation);
    setError(null);
    
    if (typeof window === "undefined") {
      return;
    }

    try {
      // Always save to localStorage for fast access
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLocation));

      // If logged in, also save to Supabase users.city
      if (user?.id) {
        const supabase = getSupabaseClient();
        if (!supabase) {
          // Supabase not available - location saved to localStorage only
          logger.warn("[Location] Supabase client not available, saved to localStorage only");
          return;
        }

        try {
          const { error: updateError } = await supabase
            .from('users')
            .update({ city: newLocation.city })
            .eq('id', user.id);

          if (updateError) {
            logger.error("[Location] Failed to save location to Supabase", updateError);
            setError("Failed to sync location");
          } else {
            setError(null);
          }
        } catch (supabaseError) {
          logger.error("[Location] Error saving location to Supabase", supabaseError);
          setError("Failed to sync location");
        }
      } else {
        setError(null);
      }
    } catch (e) {
      logger.error("[Location] Failed to save location", e);
      setError("Failed to save location");
    }
  }, [user?.id]);

  return (
    <LocationContext.Provider value={{ location, setLocation, isLoading, error }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}

