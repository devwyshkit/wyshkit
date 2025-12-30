/**
 * Standard Product Query Fields
 * Swiggy Dec 2025 pattern: Consistent field selection across all product queries
 * This ensures all queries return the same data structure and include all necessary fields
 */

/**
 * Standard fields to select for product queries
 * Includes all basic fields, compliance fields, and metadata
 * Note: products table doesn't have updated_at column, only created_at
 */
export const STANDARD_PRODUCT_FIELDS = [
  'id',
  'vendor_id',
  'name',
  'description',
  'price',
  'image',
  'images',
  'category',
  'is_personalizable',
  'variants',
  'add_ons',
  'specs',
  'materials',
  'care_instructions',
  // Compliance fields
  'hsn_code',
  'material_composition',
  'dimensions',
  'weight_grams',
  'warranty',
  'country_of_origin',
  'manufacturer_name',
  'manufacturer_address',
  'mockup_sla_hours',
  'customization_schema',
  // Metadata
  'is_active',
  'created_at',
] as const;

/**
 * Get standard product fields as a comma-separated string
 * Swiggy Dec 2025 pattern: Reusable field list for consistency
 */
export function getStandardProductFields(): string {
  return STANDARD_PRODUCT_FIELDS.join(', ');
}

/**
 * Minimal product fields for simple queries (e.g., search, listings)
 * Excludes compliance fields for performance when not needed
 */
export const MINIMAL_PRODUCT_FIELDS = [
  'id',
  'vendor_id',
  'name',
  'description',
  'price',
  'image',
  'images',
  'category',
  'is_personalizable',
] as const;

/**
 * Get minimal product fields as a comma-separated string
 */
export function getMinimalProductFields(): string {
  return MINIMAL_PRODUCT_FIELDS.join(', ');
}

