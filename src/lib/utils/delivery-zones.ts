import { BANGALORE_ZONES, CITY_ZONES } from "@/lib/constants/delivery-zones";

/**
 * Pincode to zone mapping for Bangalore
 * Maps pincode prefixes to delivery zones
 * This is a simplified mapping - in production, use a comprehensive database
 */
const BANGALORE_PINCODE_TO_ZONE: Record<string, string[]> = {
  // Koramangala: 560095, 560034
  "560095": ["Koramangala"],
  "560034": ["Koramangala"],
  // HSR Layout: 560102
  "560102": ["HSR Layout"],
  // BTM Layout: 560076, 560068
  "560076": ["BTM Layout"],
  "560068": ["BTM Layout"],
  // Indiranagar: 560038
  "560038": ["Indiranagar"],
  // Whitefield: 560066, 560048
  "560066": ["Whitefield"],
  "560048": ["Whitefield"],
  // Marathahalli: 560037
  "560037": ["Marathahalli"],
  // Electronic City: 560100
  "560100": ["Electronic City"],
  // Jayanagar: 560011, 560041
  "560011": ["Jayanagar"],
  "560041": ["Jayanagar"],
  // JP Nagar: 560078
  "560078": ["JP Nagar"],
  // Bannerghatta Road: 560076, 560083
  "560083": ["Bannerghatta Road"],
  // MG Road: 560001
  "560001": ["MG Road", "Brigade Road"],
  // Brigade Road: 560001
  // Commercial Street: 560001
  // Malleshwaram: 560003, 560055
  "560003": ["Malleshwaram"],
  "560055": ["Malleshwaram"],
  // Rajajinagar: 560010
  "560010": ["Rajajinagar"],
};

/**
 * Get zones for a pincode
 */
function getZonesForPincode(pincode: string, city: string = "Bangalore"): string[] {
  // Normalize pincode (remove spaces, ensure 6 digits)
  const normalizedPincode = pincode.trim().replace(/\s+/g, "");
  
  if (city === "Bangalore" || city === "Bengaluru") {
    // Check exact match first
    if (BANGALORE_PINCODE_TO_ZONE[normalizedPincode]) {
      return BANGALORE_PINCODE_TO_ZONE[normalizedPincode];
    }
    
    // Check prefix match (first 3 digits) for approximate matching
    const prefix = normalizedPincode.substring(0, 3);
    const matchingZones: string[] = [];
    
    Object.entries(BANGALORE_PINCODE_TO_ZONE).forEach(([pin, zones]) => {
      if (pin.startsWith(prefix)) {
        zones.forEach(zone => {
          if (!matchingZones.includes(zone)) {
            matchingZones.push(zone);
          }
        });
      }
    });
    
    if (matchingZones.length > 0) {
      return matchingZones;
    }
  }
  
  // If no mapping found, return empty array (pincode not serviceable)
  return [];
}

/**
 * Check if a pincode falls within vendor's delivery zones
 * Swiggy-style serviceability check
 */
export function isPincodeInZones(
  pincode: string,
  vendorZones: string[],
  city: string = "Bangalore"
): boolean {
  if (!pincode || vendorZones.length === 0) {
    return false;
  }

  // Get zones for this pincode
  const pincodeZones = getZonesForPincode(pincode, city);
  
  if (pincodeZones.length === 0) {
    // Pincode not in our mapping - check if vendor has city-wide delivery
    const cityZones = CITY_ZONES[city] || [];
    return cityZones.some(zone => vendorZones.includes(zone));
  }

  // Check if any pincode zone matches vendor zones
  return pincodeZones.some(zone => vendorZones.includes(zone));
}

/**
 * Get serviceable zones for a pincode
 */
export function getServiceableZones(pincode: string, city: string = "Bangalore"): string[] {
  return getZonesForPincode(pincode, city);
}

/**
 * Calculate delivery time based on distance and type
 */
export function calculateDeliveryTime(
  distance: number, // km
  type: "local" | "intercity"
): string {
  if (type === "intercity") {
    return "2-5 days";
  }

  // Local delivery: ~40-60 min after approval
  if (distance < 2) return "30-45 mins";
  if (distance < 5) return "40-60 mins";
  if (distance < 10) return "60-90 mins";
  return "90+ mins";
}

/**
 * Calculate delivery fee based on distance and type
 */
export function calculateDeliveryFee(
  distance: number,
  type: "local" | "intercity",
  express: boolean = false
): number {
  if (type === "intercity") {
    return express ? 199 : 99;
  }

  // Local delivery fees
  if (express) {
    return distance < 5 ? 149 : 199;
  }
  return distance < 5 ? 49 : 99;
}

/**
 * Validate pincode format (6 digits for India)
 */
export function isValidPincode(pincode: string): boolean {
  const normalized = pincode.trim().replace(/\s+/g, "");
  return /^\d{6}$/.test(normalized);
}
