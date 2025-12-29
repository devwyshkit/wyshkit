export const ORDER_STATUS = {
  PENDING: "pending",
  AWAITING_DETAILS: "awaiting_details",
  PERSONALIZING: "personalizing",
  MOCKUP_READY: "mockup_ready",
  APPROVED: "approved",
  CRAFTING: "crafting",
  READY_FOR_PICKUP: "ready_for_pickup",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];




