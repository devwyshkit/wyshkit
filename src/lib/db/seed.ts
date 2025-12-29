/**
 * Database seed script
 * Populates database with initial data for development/testing
 */

import { db } from "./index";
import { vendors, products, users, wallet } from "./schema";
import { logger } from "@/lib/utils/logger";

// Seed data
const seedUsers = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "customer@example.com",
    phone: "+919876543210",
    name: "Test Customer",
    role: "customer",
    city: "Bangalore",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "vendor@example.com",
    phone: "+919876543211",
    name: "Test Vendor",
    role: "vendor",
    city: "Bangalore",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "customer2@example.com",
    phone: "+919876543212",
    name: "John Doe",
    role: "customer",
    city: "Bangalore",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    email: "vendor2@example.com",
    phone: "+919876543213",
    name: "Jane Smith",
    role: "vendor",
    city: "Bangalore",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    email: "admin@example.com",
    phone: "+919876543214",
    name: "Admin User",
    role: "admin",
    city: "Bangalore",
  },
];

const seedVendors = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    userId: "00000000-0000-0000-0000-000000000002",
    name: "Artisan Crafts",
    description: "Handmade gifts and personalized items",
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38",
    rating: "4.5",
    isHyperlocal: true,
    city: "Bangalore",
    zones: ["Koramangala", "HSR Layout", "BTM"],
    maxDeliveryRadius: 10,
    intercityEnabled: true,
    status: "approved",
    onboardingStatus: "approved",
    commissionRate: "18",
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    userId: "00000000-0000-0000-0000-000000000004",
    name: "The Memento Co.",
    description: "Handcrafted ceramics and pottery for your loved ones",
    image: "https://images.unsplash.com/photo-1522673607200-1648482ce486",
    rating: "4.7",
    isHyperlocal: true,
    city: "Bangalore",
    zones: ["Indiranagar", "Whitefield", "Marathahalli"],
    maxDeliveryRadius: 15,
    intercityEnabled: true,
    status: "approved",
    onboardingStatus: "approved",
    commissionRate: "18",
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    userId: "00000000-0000-0000-0000-000000000002",
    name: "Glint & Glow",
    description: "Exquisite handmade jewelry with custom engraving options",
    image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b",
    rating: "4.9",
    isHyperlocal: true,
    city: "Bangalore",
    zones: ["Koramangala", "Indiranagar", "Jayanagar"],
    maxDeliveryRadius: 8,
    intercityEnabled: false,
    status: "approved",
    onboardingStatus: "approved",
    commissionRate: "18",
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    userId: "00000000-0000-0000-0000-000000000002",
    name: "Tech Personalize",
    description: "Custom tech accessories with laser engraving",
    image: "https://images.unsplash.com/photo-1588423770574-91092b605996",
    rating: "4.6",
    isHyperlocal: true,
    city: "Bangalore",
    zones: ["HSR Layout", "BTM", "Electronic City"],
    maxDeliveryRadius: 12,
    intercityEnabled: true,
    status: "approved",
    onboardingStatus: "approved",
    commissionRate: "18",
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    userId: "00000000-0000-0000-0000-000000000004",
    name: "Sweet Memories Bakery",
    description: "Custom cakes and baked goods for special occasions",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587",
    rating: "4.8",
    isHyperlocal: true,
    city: "Bangalore",
    zones: ["Koramangala", "Indiranagar", "Jayanagar", "BTM"],
    maxDeliveryRadius: 10,
    intercityEnabled: false,
    status: "approved",
    onboardingStatus: "approved",
    commissionRate: "18",
  },
];

const seedProducts = [
  // Artisan Crafts products
  {
    id: "20000000-0000-0000-0000-000000000001",
    vendorId: "10000000-0000-0000-0000-000000000001",
    name: "Custom Engraved Mug",
    description: "Personalized ceramic mug with your message",
    price: "599",
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d",
    category: "Ceramics",
    isPersonalizable: true,
    isActive: true,
    variants: [
      {
        id: "v1",
        name: "Size",
        options: [
          { id: "o1", name: "Small", priceModifier: 0 },
          { id: "o2", name: "Large", priceModifier: 100 },
        ],
      },
    ],
    addOns: [
      {
        id: "a1",
        name: "Gift Box",
        price: 100,
        description: "Premium gift packaging",
        requiresDetails: false,
      },
    ],
  },
  {
    id: "20000000-0000-0000-0000-000000000002",
    vendorId: "10000000-0000-0000-0000-000000000001",
    name: "Personalized Photo Frame",
    description: "Wooden photo frame with custom engraving",
    price: "899",
    image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0",
    category: "Home Decor",
    isPersonalizable: true,
    isActive: true,
    addOns: [
      {
        id: "a2",
        name: "Custom Text",
        price: 200,
        description: "Add personalized text engraving",
        requiresDetails: true,
      },
    ],
  },
  // The Memento Co. products
  {
    id: "20000000-0000-0000-0000-000000000003",
    vendorId: "10000000-0000-0000-0000-000000000002",
    name: "Hand-Painted Ceramic Bowl",
    description: "Artisan-crafted ceramic bowl with custom artwork",
    price: "1299",
    image: "https://images.unsplash.com/photo-1574482620826-40685ca5ede2",
    category: "Ceramics",
    isPersonalizable: true,
    isActive: true,
    addOns: [
      {
        id: "a3",
        name: "Photo Printing",
        price: 300,
        description: "High-res print on ceramic",
        requiresDetails: true,
      },
    ],
  },
  {
    id: "20000000-0000-0000-0000-000000000004",
    vendorId: "10000000-0000-0000-0000-000000000002",
    name: "Custom Pottery Set",
    description: "Set of 4 hand-thrown ceramic mugs",
    price: "2499",
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d",
    category: "Ceramics",
    isPersonalizable: true,
    isActive: true,
  },
  // Glint & Glow products
  {
    id: "20000000-0000-0000-0000-000000000005",
    vendorId: "10000000-0000-0000-0000-000000000003",
    name: "Engraved Silver Pendant",
    description: "Minimal silver pendant with custom text engraving",
    price: "3499",
    image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b",
    category: "Jewelry",
    isPersonalizable: true,
    isActive: true,
    addOns: [
      {
        id: "a4",
        name: "Engraving",
        price: 500,
        description: "Custom text engraving (max 20 characters)",
        requiresDetails: true,
      },
    ],
  },
  {
    id: "20000000-0000-0000-0000-000000000006",
    vendorId: "10000000-0000-0000-0000-000000000003",
    name: "Custom Name Ring",
    description: "Gold-plated ring with name engraving",
    price: "1999",
    image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9",
    category: "Jewelry",
    isPersonalizable: true,
    isActive: true,
  },
  // Tech Personalize products
  {
    id: "20000000-0000-0000-0000-000000000007",
    vendorId: "10000000-0000-0000-0000-000000000004",
    name: "Engraved AirPods Case",
    description: "Premium AirPods case with laser engraving",
    price: "1299",
    image: "https://images.unsplash.com/photo-1588423770574-91092b605996",
    category: "Tech",
    isPersonalizable: true,
    isActive: true,
    addOns: [
      {
        id: "a5",
        name: "Text Engraving",
        price: 200,
        description: "Laser engrave custom text",
        requiresDetails: true,
      },
    ],
  },
  {
    id: "20000000-0000-0000-0000-000000000008",
    vendorId: "10000000-0000-0000-0000-000000000004",
    name: "Custom Phone Case",
    description: "Personalized phone case with photo printing",
    price: "899",
    image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbab",
    category: "Tech",
    isPersonalizable: true,
    isActive: true,
    addOns: [
      {
        id: "a6",
        name: "Photo Print",
        price: 150,
        description: "Print your photo on case",
        requiresDetails: true,
      },
    ],
  },
  // Sweet Memories Bakery products
  {
    id: "20000000-0000-0000-0000-000000000009",
    vendorId: "10000000-0000-0000-0000-000000000005",
    name: "Custom Birthday Cake",
    description: "Delicious birthday cake with custom message and design",
    price: "1499",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587",
    category: "Cakes",
    isPersonalizable: true,
    isActive: true,
    variants: [
      {
        id: "v2",
        name: "Size",
        options: [
          { id: "o3", name: "Half kg", priceModifier: 0 },
          { id: "o4", name: "1 kg", priceModifier: 500 },
          { id: "o5", name: "2 kg", priceModifier: 1200 },
        ],
      },
    ],
    addOns: [
      {
        id: "a7",
        name: "Custom Message",
        price: 100,
        description: "Add personalized message on cake",
        requiresDetails: true,
      },
    ],
  },
  {
    id: "20000000-0000-0000-0000-000000000010",
    vendorId: "10000000-0000-0000-0000-000000000005",
    name: "Anniversary Cake",
    description: "Special anniversary cake with photo printing option",
    price: "1999",
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187",
    category: "Cakes",
    isPersonalizable: true,
    isActive: true,
  },
];

export async function seedDatabase() {
  if (!db) {
    logger.error("[Seed] Database not configured");
    throw new Error("Database not configured");
  }

  try {
    logger.info("[Seed] Starting database seed...");

    // Insert users
    logger.info("[Seed] Seeding users...");
    for (const user of seedUsers) {
      await db.insert(users).values(user).onConflictDoNothing();
    }

    // Insert vendors
    logger.info("[Seed] Seeding vendors...");
    for (const vendor of seedVendors) {
      await db.insert(vendors).values(vendor).onConflictDoNothing();
    }

    // Insert products
    logger.info("[Seed] Seeding products...");
    for (const product of seedProducts) {
      try {
        await db.insert(products).values(product).onConflictDoNothing();
        console.log(`[Seed] Inserted product: ${product.name}`);
      } catch (err) {
        console.error(`[Seed] Failed to insert product: ${product.name}`, err);
      }
    }

    // Initialize wallets for all users
    logger.info("[Seed] Initializing wallets...");
    for (const user of seedUsers) {
      await db.insert(wallet).values({
        userId: user.id,
        balance: "0",
      }).onConflictDoNothing();
    }

    logger.info("[Seed] Database seed completed successfully");
  } catch (error) {
    logger.error("[Seed] Failed to seed database", error);
    throw error;
  }
}

// Run seed if called directly
if (require.main === module || (import.meta as any).main) {
  seedDatabase()
    .then(() => {
      // Seed completed - use logger if available, otherwise console
      if (typeof logger !== "undefined") {
        logger.info("Seed completed");
      } else {
        // eslint-disable-next-line no-console
        console.log("Seed completed");
      }
      process.exit(0);
    })
    .catch((error) => {
      // Seed failed - use logger if available, otherwise console
      if (typeof logger !== "undefined") {
        logger.error("Seed failed", error);
      } else {
        // eslint-disable-next-line no-console
        console.error("Seed failed:", error);
      }
      process.exit(1);
    });
}


