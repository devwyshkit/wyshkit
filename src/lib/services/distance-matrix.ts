/**
 * Google Distance Matrix API integration
 * Calculates distance and travel time between vendor store and customer address
 */

import { logger } from "@/lib/utils/logger";

interface DistanceMatrixResponse {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  status: string;
}

interface DistanceResult {
  distanceKm: number;
  durationText: string;
  durationMinutes: number;
  isServiceable: boolean;
}

/**
 * Calculate distance between two coordinates using Google Distance Matrix API
 */
export async function calculateDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey?: string
): Promise<DistanceResult | null> {
  if (!apiKey) {
    logger.warn("[Distance Matrix] API key not provided, using fallback calculation");
    // Fallback: Simple haversine distance calculation
    return calculateHaversineDistance(originLat, originLng, destLat, destLng);
  }

  try {
    const origin = `${originLat},${originLng}`;
    const destination = `${destLat},${destLng}`;
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}&units=metric`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.rows[0]?.elements[0]) {
      logger.error("[Distance Matrix] API error", data);
      return calculateHaversineDistance(originLat, originLng, destLat, destLng);
    }

    const element: DistanceMatrixResponse = data.rows[0].elements[0];

    if (element.status !== "OK") {
      logger.warn("[Distance Matrix] Element status not OK", element.status);
      return null;
    }

    const distanceKm = element.distance.value / 1000; // Convert meters to km
    const durationMinutes = Math.ceil(element.duration.value / 60);

    return {
      distanceKm,
      durationText: element.duration.text,
      durationMinutes,
      isServiceable: true, // Will be checked against vendor's maxDeliveryRadius
    };
  } catch (error) {
    logger.error("[Distance Matrix] Error calculating distance", error);
    return calculateHaversineDistance(originLat, originLng, destLat, destLng);
  }
}

/**
 * Haversine formula for calculating distance between two coordinates
 * Fallback when Google API is not available
 */
function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): DistanceResult {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  
  // Estimate duration: ~30 km/h average speed in city
  const durationMinutes = Math.ceil((distanceKm / 30) * 60);

  return {
    distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
    durationText: `${durationMinutes} mins`,
    durationMinutes,
    isServiceable: true,
  };
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if customer address is within vendor's delivery radius
 */
export function isWithinDeliveryRadius(
  distanceKm: number,
  maxDeliveryRadius: number,
  intercityEnabled: boolean,
  isSameCity: boolean
): boolean {
  // Local delivery: within radius
  if (isSameCity && distanceKm <= maxDeliveryRadius) {
    return true;
  }

  // Intercity delivery: same state, up to 500km
  if (intercityEnabled && !isSameCity && distanceKm <= 500) {
    return true;
  }

  return false;
}




