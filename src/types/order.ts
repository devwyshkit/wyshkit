export type OrderStatus = 
  | "pending"
  | "awaiting_details"
  | "personalizing"
  | "mockup_ready"
  | "approved"
  | "crafting"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  selectedVariants: Record<string, string>;
  selectedAddOns: string[];
  customization?: {
    text?: string;
    photo?: string;
    giftMessage?: string;
  };
}

export interface Order {
  id: string;
  orderNumber: string; // WK12345
  customerId: string;
  vendorId: string;
  status: OrderStatus;
  items: OrderItem[];
  itemTotal: number;
  deliveryFee: number;
  platformFee: number;
  cashbackUsed: number;
  total: number;
  deliveryType: "local" | "intercity";
  deliveryAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
  };
  gstin?: string;
  paymentId?: string;
  paymentStatus: "pending" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
}




