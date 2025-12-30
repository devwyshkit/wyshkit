import { pgTable, text, timestamp, boolean, decimal, jsonb, integer, uuid, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'awaiting_details',
  'personalizing',
  'mockup_ready',
  'approved',
  'crafting',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled'
]);

export const userRoleEnum = pgEnum('user_role', ['customer', 'vendor', 'admin', 'partner']);

export const deliveryTypeEnum = pgEnum('delivery_type', ['local', 'intercity']);

// Users (Supabase Auth compatible)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  name: text('name'),
  role: userRoleEnum('role').default('customer'),
  city: text('city'), // User's city for location-based features
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User addresses (for delivery)
export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  recipientName: text('recipient_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  pincode: text('pincode').notNull(),
  lat: decimal('lat', { precision: 10, scale: 7 }), // Latitude for distance calculation
  lng: decimal('lng', { precision: 10, scale: 7 }), // Longitude for distance calculation
  label: text('label').default('Home'), // Address type: Home, Work, Other
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('addresses_user_id_idx').on(table.userId),
  userIdIsDefaultIdx: index('addresses_user_id_is_default_idx').on(table.userId, table.isDefault),
}));

// Vendors
export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  image: text('image'),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  isHyperlocal: boolean('is_hyperlocal').default(true),
  city: text('city').notNull(),
  zones: jsonb('zones').$type<string[]>().notNull(), // ['Koramangala', 'HSR'] - legacy, will be replaced by distance-based
  maxDeliveryRadius: integer('max_delivery_radius').default(10), // km - distance-based delivery
  intercityEnabled: boolean('intercity_enabled').default(false),
  // Store location for distance calculation
  storeAddress: text('store_address'), // Full address string
  storeLat: decimal('store_lat', { precision: 10, scale: 7 }), // Latitude for distance calculation
  storeLng: decimal('store_lng', { precision: 10, scale: 7 }), // Longitude for distance calculation
  // Payment integration
  razorpayAccountId: text('razorpay_account_id'), // Razorpay Route account ID
  gstin: text('gstin'),
  pan: text('pan'),
  bankAccount: jsonb('bank_account').$type<{
    accountNumber: string;
    ifsc: string;
    beneficiaryName: string;
  }>(),
  status: text('status').default('pending'), // pending, approved, rejected
  onboardingStatus: text('onboarding_status').default('pending'), // pending, submitted, approved, rejected
  onboardingData: jsonb('onboarding_data').$type<{
    businessName: string;
    gstin: string;
    pan: string;
    storeAddress: string;
    operatingHours: Record<string, { open: string; close: string }>;
    bankAccount: { accountNumber: string; ifsc: string; beneficiaryName: string };
    zones: string[];
    maxDeliveryRadius: number;
    intercityEnabled: boolean;
    storePhotos: string[];
    documents: { gstin: string; pan: string; cheque: string };
    }>(),
    isOnline: boolean('is_online').default(true),
    commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('18'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  cityIdx: index('vendors_city_idx').on(table.city),
  statusIdx: index('vendors_status_idx').on(table.status),
  cityStatusIdx: index('vendors_city_status_idx').on(table.city, table.status),
}));

// Products
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  image: text('image').notNull(),
  images: jsonb('images').$type<string[]>(),
  category: text('category').notNull(),
  isPersonalizable: boolean('is_personalizable').default(false),
  variants: jsonb('variants').$type<Array<{
    id: string;
    name: string;
    options: Array<{ id: string; name: string; priceModifier?: number }>;
  }>>(),
  addOns: jsonb('add_ons').$type<Array<{
    id: string;
    name: string;
    price: number;
    description: string;
    requiresDetails: boolean;
  }>>(),
  specs: jsonb('specs').$type<Array<{ label: string; value: string }>>(),
  materials: jsonb('materials').$type<string[]>(),
  careInstructions: text('care_instructions'),
  // Compliance fields (mandatory for marketplace)
  hsnCode: text('hsn_code'), // 6 digits HSN code
  materialComposition: text('material_composition'), // e.g., "100% Cotton"
  dimensions: jsonb('dimensions').$type<{ length: number; width: number; height: number }>(), // in cm
  weightGrams: integer('weight_grams'), // weight in grams
  warranty: text('warranty'), // warranty text or "No warranty"
  countryOfOrigin: text('country_of_origin').default('India'),
  manufacturerName: text('manufacturer_name'), // Auto-filled from vendor KYC
  manufacturerAddress: text('manufacturer_address'), // Auto-filled from vendor KYC
  mockupSlaHours: integer('mockup_sla_hours'), // 2, 4, 6, 12, or 24 hours
  customizationSchema: jsonb('customization_schema').$type<{
    requiresText?: boolean;
    requiresPhoto?: boolean;
    maxTextLength?: number;
  }>(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  vendorIdIdx: index('products_vendor_id_idx').on(table.vendorId),
  categoryIdx: index('products_category_idx').on(table.category),
  isActiveIdx: index('products_is_active_idx').on(table.isActive),
  vendorIdCategoryIsActiveIdx: index('products_vendor_id_category_is_active_idx').on(table.vendorId, table.category, table.isActive),
}));

// Product Reviews
export const productReviews = pgTable('product_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  orderId: uuid('order_id').references(() => orders.id), // Link to order (only delivered orders can be reviewed)
  rating: integer('rating').notNull(), // 1-5 stars
  comment: text('comment'), // Optional text review
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Orders
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull().unique(), // WK12345
  customerId: uuid('customer_id').references(() => users.id).notNull(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  status: orderStatusEnum('status').default('pending'),
  subStatus: text('sub_status'), // creating_mockup, awaiting_approval, ready_for_pickup
  items: jsonb('items').$type<Array<{
    productId: string;
    quantity: number;
    price: number;
    selectedVariants: Record<string, string>;
    selectedAddOns: string[];
    customization?: {
      text?: string;
      photo?: string;
      giftMessage?: string;
    };
  }>>().notNull(),
  itemTotal: decimal('item_total', { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 10, scale: 2 }).default('5'),
  cashbackUsed: decimal('cashback_used', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  deliveryType: deliveryTypeEnum('delivery_type').default('local'),
  deliveryAddress: jsonb('delivery_address').$type<{
    name: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
  }>().notNull(),
  gstin: text('gstin'),
  paymentId: text('payment_id'), // Razorpay payment ID
  paymentStatus: text('payment_status').default('pending'), // pending, completed, failed
  razorpayRouteId: text('razorpay_route_id'), // For split payment
  commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }),
  vendorAmount: decimal('vendor_amount', { precision: 10, scale: 2 }),
  mockupImages: jsonb('mockup_images').$type<Record<string, string[]>>(), // { productId: [urls] }
  mockupApprovedAt: timestamp('mockup_approved_at'),
  acceptDeadline: timestamp('accept_deadline'), // 5 min countdown
  mockupSla: timestamp('mockup_sla'), // 2 hours from accept
  revisionRequest: jsonb('revision_request').$type<{
    productId: string;
    feedback: string;
    requestedAt: string;
  }>(),
  deliveryPartnerId: uuid('delivery_partner_id'),
  deliveryPartnerPhone: text('delivery_partner_phone'),
  estimatedDelivery: timestamp('estimated_delivery'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  customerIdIdx: index('orders_customer_id_idx').on(table.customerId),
  vendorIdIdx: index('orders_vendor_id_idx').on(table.vendorId),
  statusIdx: index('orders_status_idx').on(table.status),
  customerIdStatusIdx: index('orders_customer_id_status_idx').on(table.customerId, table.status),
  vendorIdStatusIdx: index('orders_vendor_id_status_idx').on(table.vendorId, table.status),
}));

// Notifications (Supabase-compatible)
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'order' | 'account' | 'promotion'
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: boolean('read').default(false),
  data: jsonb('data').$type<Record<string, unknown>>(), // Additional data (orderId, etc.)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  userIdReadIdx: index('notifications_user_id_read_idx').on(table.userId, table.read),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
}));

// Cashback/Wallet
export const wallet = pgTable('wallet', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  balance: decimal('balance', { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').references(() => wallet.id).notNull(),
  type: text('type').notNull(), // credit, debit
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  orderId: uuid('order_id').references(() => orders.id),
  // Removed expiresAt - cashback has no expiry
  createdAt: timestamp('created_at').defaultNow(),
});

// Cashback Configuration (global, category, vendor overrides)
export const cashbackConfig = pgTable('cashback_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // 'global' | 'category' | 'vendor'
  entityId: uuid('entity_id'), // null for global, category_id or vendor_id for overrides
  percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull(), // 10.00 for 10%
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Disputes
export const disputes = pgTable('disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  type: text('type').notNull(), // wrong_product, damaged, quality, other
  customerClaim: text('customer_claim').notNull(),
  customerPhotos: jsonb('customer_photos').$type<string[]>(),
  vendorResponse: text('vendor_response'),
  status: text('status').default('open'), // open, resolved, closed
  resolution: text('resolution'), // replacement, refund, closed
  refundAmount: decimal('refund_amount', { precision: 10, scale: 2 }),
  deductedFromVendor: boolean('deducted_from_vendor').default(false),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// NOTE: OTP Codes table removed - we use Supabase Auth for OTP authentication
// This eliminates legacy code and maximizes Supabase usage (Swiggy Dec 2025 pattern)

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  vendor: one(vendors),
  orders: many(orders),
  wallet: one(wallet),
  addresses: many(addresses),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, { fields: [vendors.userId], references: [users.id] }),
  products: many(products),
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  vendor: one(vendors, { fields: [products.vendorId], references: [vendors.id] }),
  reviews: many(productReviews),
}));

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [productReviews.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [productReviews.orderId],
    references: [orders.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, { fields: [orders.customerId], references: [users.id] }),
  vendor: one(vendors, { fields: [orders.vendorId], references: [vendors.id] }),
  walletTransactions: many(walletTransactions),
}));

