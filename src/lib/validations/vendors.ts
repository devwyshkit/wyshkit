import { z } from "zod";

// Vendor query parameters schema
export const vendorQuerySchema = z.object({
  city: z.string().max(100).optional(),
  zone: z.string().max(100).optional(),
  status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  search: z.string().max(200).optional(),
  sortBy: z.enum(["rating", "deliveryTime", "distance", "name"]).optional().default("rating"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export type VendorQueryInput = z.infer<typeof vendorQuerySchema>;

// Vendor ID parameter schema (accepts any valid UUID-like format)
export const vendorIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Invalid vendor ID format"),
});

export type VendorIdInput = z.infer<typeof vendorIdSchema>;


