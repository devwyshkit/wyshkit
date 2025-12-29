/**
 * DEPRECATED: This file is kept for reference only.
 * Use database queries instead via API routes.
 * 
 * Types have been moved to src/types/
 * Mock data arrays removed - use API endpoints
 */

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  images?: string[];
  category: string;
  vendorId: string;
  specs?: { label: string; value: string }[];
  careInstructions?: string;
  materials?: string[];
  addOns?: { id: string; name: string; price: number; description: string }[];
  variants?: {
    id: string;
    name: string;
    options: { id: string; name: string; priceModifier?: number }[];
  }[];
}

export interface Vendor {
  id: string;
  name: string;
  rating: number;
  deliveryTime: string;
  distance: string;
  image: string;
  tags: string[];
  description: string;
  isHyperlocal: boolean;
  about?: string;
  deliveryZones?: {
    intracity?: string[];
    intercity?: string[];
  };
}

// Mock data arrays removed - use API endpoints:
// GET /api/vendors
// GET /api/products
// GET /api/vendors/[id]/products




