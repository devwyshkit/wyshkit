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
  // Compliance fields (mandatory for marketplace)
  hsnCode?: string;
  materialComposition?: string;
  dimensions?: { length: number; width: number; height: number };
  weightGrams?: number;
  warranty?: string;
  countryOfOrigin?: string;
  manufacturerName?: string;
  manufacturerAddress?: string;
  mockupSlaHours?: number;
  customizationSchema?: {
    requiresText?: boolean;
    requiresPhoto?: boolean;
    maxTextLength?: number;
  };
  // Reviews (computed)
  averageRating?: number;
  reviewCount?: number;
  isPersonalizable?: boolean;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  orderId?: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
}

