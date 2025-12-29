export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  method: "upi" | "card" | "wallet" | "netbanking";
  razorpayPaymentId?: string;
  razorpayRouteId?: string;
  createdAt: string;
}

export interface PaymentSplit {
  wyshkitAmount: number; // Commission (18%)
  vendorAmount: number; // Vendor payment (82%)
  heldUntil?: string; // Delivery date for vendor payment
}




