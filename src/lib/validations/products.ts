import { z } from "zod";

// Product query parameters schema
export const productQuerySchema = z.object({
  category: z.string().max(100).optional(),
  vendorId: z.string().uuid("Invalid vendor ID format").optional(),
  isActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  search: z.string().max(200).optional(),
  sortBy: z.enum(["price", "name", "rating", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;

// Product ID parameter schema
export const productIdSchema = z.object({
  id: z.string().uuid("Invalid product ID format"),
});

export type ProductIdInput = z.infer<typeof productIdSchema>;


