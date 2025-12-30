/**
 * Google Places API integration
 * Swiggy-style location and address autocomplete
 * Swiggy Dec 2025 pattern: Session tokens for billing optimization, no manual parsing
 */

import { logger } from "@/lib/utils/logger";

/**
 * Generate a session token for Google Places API
 * Session tokens allow Google to group related requests and optimize billing
 * Swiggy Dec 2025 pattern: Use session tokens for cost optimization
 */
export function generateSessionToken(): string {
  // Generate UUID v4 for session token
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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

    // Handle specific Google Places API errors
    if (data.status === "ZERO_RESULTS") {
      return [];
    }
    
    if (data.status === "INVALID_REQUEST") {
      logger.error("[Google Places] Invalid request", data);
      throw new Error("Invalid search query. Please try again.");
    }
    
    if (data.status === "OVER_QUERY_LIMIT") {
      logger.error("[Google Places] Over query limit", data);
      throw new Error("Too many requests. Please try again later.");
    }
    
    if (data.status === "REQUEST_DENIED") {
      logger.error("[Google Places] Request denied", data);
      throw new Error("API configuration issue. Please contact support.");
    }
    
    if (data.status === "UNKNOWN_ERROR") {
      logger.error("[Google Places] Unknown error", data);
      throw new Error("Service temporarily unavailable. Please try again.");
    }
    
    if (data.status !== "OK") {
      logger.error("[Google Places] Autocomplete error", data);
      throw new Error("Failed to search addresses. Please try again.");
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
    // Re-throw if it's already a user-friendly error
    if (error instanceof Error && error.message.includes("Invalid") || error.message.includes("Too many") || error.message.includes("API") || error.message.includes("Service")) {
      throw error;
    }
    logger.error("[Google Places] Autocomplete failed", error);
    throw new Error("Failed to search addresses. Please try again.");
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

    // Handle specific Google Places API errors
    if (data.status === "INVALID_REQUEST") {
      logger.error("[Google Places] Invalid request for place details", data);
      throw new Error("Invalid place ID. Please try selecting the address again.");
    }
    
    if (data.status === "OVER_QUERY_LIMIT") {
      logger.error("[Google Places] Over query limit for place details", data);
      throw new Error("Too many requests. Please try again later.");
    }
    
    if (data.status === "REQUEST_DENIED") {
      logger.error("[Google Places] Request denied for place details", data);
      throw new Error("API configuration issue. Please contact support.");
    }
    
    if (data.status === "UNKNOWN_ERROR") {
      logger.error("[Google Places] Unknown error for place details", data);
      throw new Error("Service temporarily unavailable. Please try again.");
    }
    
    if (data.status !== "OK" || !data.result) {
      logger.error("[Google Places] Details error", data);
      throw new Error("Failed to load address details. Please try again.");
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
    // Re-throw if it's already a user-friendly error
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("Too many") || error.message.includes("API") || error.message.includes("Service") || error.message.includes("Failed"))) {
      throw error;
    }
    logger.error("[Google Places] Details failed", error);
    throw new Error("Failed to load address details. Please try again.");
  }
}

/**
 * Parse address components from Google Places response
 * Swiggy Dec 2025 pattern: Use Google structured components only, no manual parsing
 */
export function parseAddress(details: PlaceDetails): ParsedAddress {
  const components = details.addressComponents;
  
  if (!components || components.length === 0) {
    logger.warn("[Google Places] No address components found", { placeId: details.placeId });
    throw new Error("Address data incomplete. Please select a different address.");
  }
  
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

  // Swiggy Dec 2025 pattern: Use structured components only, no manual parsing fallbacks
  // If city is not found in components, use area or state as fallback (still from structured data)
  const finalCity = city || area || state || "";
  
  if (!finalCity) {
    logger.warn("[Google Places] City not found in address components", {
      placeId: details.placeId,
      components: components.map(c => ({ types: c.types, longName: c.longName }))
    });
    // Don't throw - allow empty city but log for debugging
  }

  return {
    address,
    city: finalCity,
    pincode: pincode || "",
    state: state || "",
    country: country || "",
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

    // Handle specific Google Places API errors
    if (data.status === "ZERO_RESULTS") {
      logger.warn("[Google Places] No results for reverse geocode", { lat, lng });
      return null;
    }
    
    if (data.status === "INVALID_REQUEST") {
      logger.error("[Google Places] Invalid request for reverse geocode", data);
      throw new Error("Invalid coordinates. Please try again.");
    }
    
    if (data.status === "OVER_QUERY_LIMIT") {
      logger.error("[Google Places] Over query limit for reverse geocode", data);
      throw new Error("Too many requests. Please try again later.");
    }
    
    if (data.status === "REQUEST_DENIED") {
      logger.error("[Google Places] Request denied for reverse geocode", data);
      throw new Error("API configuration issue. Please contact support.");
    }
    
    if (data.status === "UNKNOWN_ERROR") {
      logger.error("[Google Places] Unknown error for reverse geocode", data);
      throw new Error("Service temporarily unavailable. Please try again.");
    }
    
    if (data.status !== "OK" || !data.results?.[0]) {
      logger.error("[Google Places] Reverse geocode error", data);
      throw new Error("Failed to get address from location. Please try again.");
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
    // Re-throw if it's already a user-friendly error
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("Too many") || error.message.includes("API") || error.message.includes("Service") || error.message.includes("Failed"))) {
      throw error;
    }
    logger.error("[Google Places] Reverse geocode failed", error);
    throw new Error("Failed to get address from location. Please try again.");
  }
}

/**
 * Validate address using Google Address Validation API
 * Swiggy Dec 2025 pattern: Validate addresses before saving
 * Optional but recommended for production
 */
export async function validateAddress(
  address: string,
  apiKey: string
): Promise<{ isValid: boolean; confidence: number; message?: string }> {
  if (!address || !apiKey) {
    return { isValid: false, confidence: 0, message: "Address or API key missing" };
  }

  try {
    const url = new URL("https://addressvalidation.googleapis.com/v1:validateAddress");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: {
          addressLines: [address],
          regionCode: "IN", // India
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      logger.error("[Google Places] Address validation error", data);
      // Don't fail address save if validation fails - just log
      return { isValid: true, confidence: 0.5, message: "Validation unavailable" };
    }

    const result = data.result;
    const verdict = result.verdict;
    const addressComponents = result.address;

    // Check if address is complete and valid
    const isValid = verdict?.addressComplete === true && verdict?.hasUnconfirmedComponents === false;
    const confidence = result.verdict?.validationGranularity === "SUB_PREMISE" ? 0.9 :
                      result.verdict?.validationGranularity === "PREMISE" ? 0.8 :
                      result.verdict?.validationGranularity === "ROUTE" ? 0.7 : 0.5;

    return {
      isValid,
      confidence,
      message: isValid ? undefined : "Address may be incomplete or invalid",
    };
  } catch (error) {
    logger.error("[Google Places] Address validation failed", error);
    // Don't fail address save if validation fails - just log
    return { isValid: true, confidence: 0.5, message: "Validation unavailable" };
  }
}

