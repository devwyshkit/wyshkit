"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/utils/logger";

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
  const [location, setLocationState] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load location from localStorage on mount (client-side only)
  useEffect(() => {
    // SSR safety check - localStorage is only available in browser
    if (typeof window === "undefined") {
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setLocationState(parsed);
      }
    } catch (e) {
      // Only log in development to avoid console errors in production
      if (process.env.NODE_ENV === "development") {
        logger.warn("[Location] Failed to parse saved location", e);
      }
    }
  }, []);

  // Save location to localStorage when it changes (client-side only)
  const setLocation = useCallback((newLocation: Location) => {
    setLocationState(newLocation);
    
    // SSR safety check - localStorage is only available in browser
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLocation));
      setError(null);
    } catch (e) {
      // Only log in development to avoid console errors in production
      if (process.env.NODE_ENV === "development") {
        logger.error("[Location] Failed to save location", e);
      }
      setError("Failed to save location");
    }
  }, []);

  return (
    <LocationContext.Provider value={{ location, setLocation, isLoading, error }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}

