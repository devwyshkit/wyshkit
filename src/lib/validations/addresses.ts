import { z } from "zod";

/**
 * Address validation schemas
 */

export const addressSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required").max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  address: z.string().min(1, "Address is required").max(500),
  city: z.string().min(1, "City is required").max(100),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  label: z.enum(['Home', 'Work', 'Other']).default('Home'),
  isDefault: z.boolean().default(false),
});

export const createAddressSchema = addressSchema.extend({
  userId: z.string().uuid("Invalid user ID").optional(), // Optional - will be set from session
});

export const updateAddressSchema = addressSchema.partial().extend({
  id: z.string().uuid("Invalid address ID"),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

