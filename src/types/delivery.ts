export type DeliveryType = "local" | "intercity";

export interface DeliveryAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  type: DeliveryType;
  address: DeliveryAddress;
  partnerId?: string;
  partnerName?: string;
  partnerPhone?: string;
  status: "pending" | "assigned" | "picked_up" | "out_for_delivery" | "delivered";
  estimatedDelivery?: string;
  deliveredAt?: string;
}




