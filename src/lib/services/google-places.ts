/**
 * Google Places API integration
 * Swiggy-style location and address autocomplete
 */

import { logger } from "@/lib/utils/logger";

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  addressComponents: {
    longName: string;
    shortName: string;
    types: string[];
  }[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  name?: string;
}

export interface ParsedAddress {
  address: string;
  city: string;
  pincode: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
  area?: string; // e.g., "Indiranagar"
}

/**
 * Autocomplete search for locations (Swiggy-style)
 */
export async function searchPlaces(
  query: string,
  apiKey: string,
  sessionToken?: string
): Promise<PlacePrediction[]> {
  if (!query.trim() || !apiKey) return [];

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", query);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("components", "country:in"); // Restrict to India
    if (sessionToken) {
      url.searchParams.set("sessiontoken", sessionToken);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      logger.error("[Google Places] Autocomplete error", data);
      return [];
    }

    interface GooglePlacePrediction {
      place_id: string;
      description: string;
      structured_formatting?: {
        main_text?: string;
        secondary_text?: string;
      };
    }
    
    return (data.predictions || []).map((pred: GooglePlacePrediction) => ({
      placeId: pred.place_id,
      description: pred.description,
      mainText: pred.structured_formatting?.main_text || pred.description,
      secondaryText: pred.structured_formatting?.secondary_text || "",
    }));
  } catch (error) {
    logger.error("[Google Places] Autocomplete failed", error);
    return [];
  }
}

/**
 * Get place details with coordinates
 */
export async function getPlaceDetails(
  placeId: string,
  apiKey: string,
  sessionToken?: string
): Promise<PlaceDetails | null> {
  if (!placeId || !apiKey) return null;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("fields", "place_id,formatted_address,address_components,geometry,name");
    if (sessionToken) {
      url.searchParams.set("sessiontoken", sessionToken);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" || !data.result) {
      logger.error("[Google Places] Details error", data);
      return null;
    }

    return {
      placeId: data.result.place_id,
      formattedAddress: data.result.formatted_address,
      addressComponents: data.result.address_components || [],
      geometry: {
        location: {
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        },
      },
      name: data.result.name,
    };
  } catch (error) {
    logger.error("[Google Places] Details failed", error);
    return null;
  }
}

/**
 * Parse address components from Google Places response
 */
export function parseAddress(details: PlaceDetails): ParsedAddress {
  const components = details.addressComponents;
  
  const getComponent = (types: string[]) => {
    const comp = components.find(c => types.some(t => c.types.includes(t)));
    return comp?.longName || "";
  };

  const address = details.formattedAddress;
  
  // Try multiple address component types for city (priority order)
  const city = getComponent([
    "locality",
    "administrative_area_level_2",
    "administrative_area_level_3",
    "postal_town"
  ]);
  
  const area = getComponent(["sublocality", "sublocality_level_1", "neighborhood"]);
  const pincode = getComponent(["postal_code"]);
  const state = getComponent(["administrative_area_level_1"]);
  const country = getComponent(["country"]);

  // Fallback: Extract city from formatted address if not found in components
  // Google Places formatted address typically: "Street, Area, City, State Pincode, Country"
  let extractedCity = city;
  if (!extractedCity && address) {
    const parts = address.split(",").map(p => p.trim());
    // Usually city is the 3rd segment (index 2) or 2nd segment (index 1) depending on format
    // For India: "Street, Area, City, State Pincode, Country"
    if (parts.length >= 3) {
      extractedCity = parts[2] || parts[1] || "";
    } else if (parts.length === 2) {
      extractedCity = parts[1] || "";
    }
    // Remove pincode if present (e.g., "Bangalore 560038" -> "Bangalore")
    if (extractedCity) {
      extractedCity = extractedCity.replace(/\s+\d{6}$/, "").trim();
    }
  }

  // Final fallback priority: extracted city > area > state > empty string (never "Unknown")
  const finalCity = extractedCity || area || state || "";

  return {
    address,
    city: finalCity,
    pincode: pincode || "",
    state,
    country,
    lat: details.geometry.location.lat,
    lng: details.geometry.location.lng,
    area: area || finalCity,
  };
}

/**
 * Get current location using GPS
 */
export function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    // SSR safety check - navigator is only available in browser
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        logger.error("[Google Places] GPS error", error);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Reverse geocode coordinates to get address
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey: string
): Promise<PlaceDetails | null> {
  if (!apiKey) return null;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("result_type", "street_address|locality|sublocality");

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" || !data.results?.[0]) {
      logger.error("[Google Places] Reverse geocode error", data);
      return null;
    }

    const result = data.results[0];
    return {
      placeId: result.place_id,
      formattedAddress: result.formatted_address,
      addressComponents: result.address_components || [],
      geometry: {
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
      },
    };
  } catch (error) {
    logger.error("[Google Places] Reverse geocode failed", error);
    return null;
  }
}

