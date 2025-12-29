export interface Vendor {
  id: string;
  name: string;
  rating: number | string;
  deliveryTime: string;
  distance: string;
  image: string;
  tags: string[];
  description: string;
  isHyperlocal: boolean;
  about?: string;
  city?: string;
  isOnline?: boolean;
  deliveryZones?: {
    intracity?: string[];
    intercity?: string[];
  };
}
