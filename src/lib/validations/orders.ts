import { z } from "zod";

// Order item validation schema
export const orderItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  quantity: z.number().int().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive"),
  selectedVariants: z.record(z.string(), z.string()).optional(),
  selectedAddOns: z.array(z.string()).optional(),
  customization: z.object({
    text: z.string().max(500).optional(),
    photo: z.string().url().optional(),
    giftMessage: z.string().max(500).optional(),
  }).optional(),
});

// Delivery address validation schema
export const deliveryAddressSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  address: z.string().min(1, "Address is required").max(500),
  city: z.string().min(1, "City is required").max(100),
  pincode: z.string().regex(/^\d{6}$/, "Invalid pincode"),
});

// Create order request schema
export const createOrderSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID format").optional(), // Optional - will be set from session
  vendorId: z.string().uuid("Invalid vendor ID format"),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  deliveryAddress: deliveryAddressSchema,
  deliveryFee: z.number().nonnegative().optional().default(0),
  platformFee: z.number().nonnegative().optional().default(5),
  cashbackUsed: z.number().nonnegative().optional().default(0),
  deliveryType: z.enum(["local", "intercity"]).optional().default("local"),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format").optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type DeliveryAddressInput = z.infer<typeof deliveryAddressSchema>;

