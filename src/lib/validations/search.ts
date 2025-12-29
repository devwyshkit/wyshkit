import { z } from "zod";

// Search query parameters schema
export const searchQuerySchema = z.object({
  q: z.string().max(200).optional(), // Made optional to support occasion-only searches
  type: z.enum(["all", "vendors", "products"]).optional().default("all"),
  category: z.string().max(100).optional(),
  occasion: z.string().max(100).optional(), // NEW: Support occasion filtering
  city: z.string().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;


