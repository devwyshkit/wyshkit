# Search Page - Occasion & Tab Parameter Support

## Overview
Fix the search page to properly handle `occasion` and `tab` URL parameters from the occasion cards and "See All" button. Currently, these parameters are ignored, causing broken navigation.

## Current Issues
1. **Occasion Parameter**: URLs like `/search?occasion=birthday` are not processed - the search page only reads `q` parameter
2. **Tab Parameter**: URLs like `/search?tab=occasions` are not handled - no tab functionality exists
3. **Search Hook**: `useSearch` hook doesn't support occasion filtering

## Implementation Steps

### 1. Update Search Validation Schema
**File**: `src/lib/validations/search.ts`

Add `occasion` parameter to the schema:
```typescript
export const searchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required").max(200).optional(), // Make optional
  type: z.enum(["all", "vendors", "products"]).optional().default("all"),
  category: z.string().max(100).optional(),
  occasion: z.string().max(100).optional(), // NEW
  city: z.string().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});
```

### 2. Update useSearch Hook
**File**: `src/hooks/api/useSearch.ts`

- Add `occasion` parameter support
- Map occasion values to search queries (e.g., "birthday" → search for birthday-related products)
- Update the hook to accept occasion as a parameter
- Pass occasion to API calls

### 3. Update Search Page Component
**File**: `src/app/(customer)/search/page.tsx`

- Read `occasion` parameter from URL: `searchParams.get('occasion')`
- Read `tab` parameter from URL: `searchParams.get('tab')`
- When `occasion` is present, automatically perform search with occasion filter
- When `tab=occasions`, show an occasions grid/browse view
- Update URL sync logic to preserve `occasion` and `tab` parameters
- Add tab navigation UI (All, Occasions) when appropriate

### 4. Map Occasion Values to Search Queries
Create a mapping function to convert occasion slugs to searchable terms:
- `birthday` → "birthday"
- `anniversary` → "anniversary"
- `wedding` → "wedding"
- `baby-shower` → "baby shower"
- `valentine` → "valentine"
- `mothers-day` → "mother's day"

### 5. Add Occasions Tab View
When `tab=occasions` is present:
- Show a grid of all available occasions (similar to home page)
- Allow browsing occasions without a search query
- Link to `/search?occasion=<occasion-slug>` when an occasion is clicked

## Technical Details

### URL Parameter Handling
- Preserve `occasion` and `tab` when updating `q` parameter
- When user types in search, keep `tab` if it exists
- When user clicks an occasion, set `occasion` and clear `q` if needed

### Search Behavior
- If `occasion` is present: Search for products/vendors matching that occasion
- If `q` is present: Normal text search
- If both are present: Combine filters (search query + occasion filter)

### Tab System
- Default: No tabs shown (current behavior)
- When `tab=occasions`: Show occasions browse view
- Future: Can add more tabs like "Categories", "Trending", etc.

## Files to Modify

1. `src/lib/validations/search.ts` - Add occasion parameter
2. `src/hooks/api/useSearch.ts` - Support occasion filtering
3. `src/app/(customer)/search/page.tsx` - Handle occasion and tab parameters, add tab UI

## Testing Checklist

- [ ] Clicking occasion card navigates to `/search?occasion=birthday` and shows filtered results
- [ ] "See All" button navigates to `/search?tab=occasions` and shows occasions view
- [ ] Typing in search preserves `tab` parameter if present
- [ ] Occasion filter works with text search (both parameters together)
- [ ] URL parameters persist on page refresh
- [ ] Back/forward navigation works correctly with parameters



