// Bangalore delivery zones (Swiggy-style)
export const BANGALORE_ZONES = [
  "Koramangala",
  "HSR Layout",
  "BTM Layout",
  "Indiranagar",
  "Whitefield",
  "Marathahalli",
  "Electronic City",
  "Jayanagar",
  "JP Nagar",
  "Bannerghatta Road",
  "MG Road",
  "Brigade Road",
  "Commercial Street",
  "Malleshwaram",
  "Rajajinagar",
] as const;

export type BangaloreZone = typeof BANGALORE_ZONES[number];

// City to zones mapping
export const CITY_ZONES: Record<string, readonly string[]> = {
  Bangalore: BANGALORE_ZONES,
  // Add more cities as needed
};




