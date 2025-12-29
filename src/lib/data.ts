// Types are exported from @/types/product and @/types/vendor
// This file only contains mock data arrays

import type { Vendor } from "@/types/vendor";
import type { Product } from "@/types/product";

// Generate consistent UUIDs for mock data
const VENDOR_1_ID = "10000000-0000-0000-0000-000000000001";
const VENDOR_2_ID = "10000000-0000-0000-0000-000000000002";
const VENDOR_3_ID = "10000000-0000-0000-0000-000000000003";

const PRODUCT_1_ID = "20000000-0000-0000-0000-000000000001";
const PRODUCT_2_ID = "20000000-0000-0000-0000-000000000002";
const PRODUCT_3_ID = "20000000-0000-0000-0000-000000000003";

export const vendors: Vendor[] = [
  {
    id: VENDOR_1_ID,
    name: "Artisan Hub",
    rating: 4.8,
    deliveryTime: "40-60 mins",
    distance: "2.4 km",
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38",
    tags: ["Personalized", "Engraving", "Tech Accessories"],
    description: "Specializing in tech engraving and custom leather goods.",
    isHyperlocal: true,
    about: "Founded in 2018, Artisan Hub blends traditional craftsmanship with modern laser technology to create bespoke tech accessories.",
    deliveryZones: {
      intracity: ["560001", "560002", "560003", "560004", "560025", "560066", "560076"],
    },
  },
  {
    id: VENDOR_2_ID,
    name: "The Memento Co.",
    rating: 4.5,
    deliveryTime: "1-2 days",
    distance: "Intercity",
    image: "https://images.unsplash.com/photo-1522673607200-1648482ce486",
    tags: ["Ceramics", "Home Decor", "Pottery"],
    description: "Handcrafted ceramics and pottery for your loved ones.",
    isHyperlocal: false,
    about: "A family-run pottery studio dedicated to sustainable, hand-thrown ceramics that tell a story in every piece.",
    deliveryZones: {
      intercity: ["Bangalore", "Mumbai", "Delhi", "Pune", "Hyderabad"],
    },
  },
  {
    id: VENDOR_3_ID,
    name: "Glint & Glow",
    rating: 4.9,
    deliveryTime: "30-45 mins",
    distance: "1.2 km",
    image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b",
    tags: ["Jewelry", "Custom Jewelry", "Handmade"],
    description: "Exquisite handmade jewelry with custom engraving options.",
    isHyperlocal: true,
    about: "Specializing in minimal, recycled gold and silver jewelry designed for everyday elegance.",
    deliveryZones: {
      intracity: ["560001", "560025", "560066", "560076", "560095"],
    },
  },
];

export const products: Product[] = [
  {
    id: PRODUCT_1_ID,
    vendorId: VENDOR_1_ID,
    name: "Engraved AirPods Pro 2",
    price: 24900,
    description: "Premium AirPods Pro with personalized laser engraving on the case. Comes with 1 year warranty. High-fidelity audio, Active Noise Cancellation, and personalized spatial audio.",
    image: "https://images.unsplash.com/photo-1588423770574-91092b605996",
    images: [
      "https://images.unsplash.com/photo-1588423770574-91092b605996",
      "https://images.unsplash.com/photo-1603351154351-5e2d0600bb77",
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434"
    ],
    category: "Tech",
    specs: [
      { label: "Battery Life", value: "Up to 6 hours" },
      { label: "Weight", value: "5.3 grams" },
      { label: "Connectivity", value: "Bluetooth 5.3" }
    ],
    materials: ["Recycled Plastic", "Aluminum", "Silicone"],
    careInstructions: "Keep away from extreme moisture and clean with a lint-free cloth.",
    addOns: [
      { id: "a1", name: "Custom Text Engraving", price: 500, description: "Up to 15 characters" },
      { id: "a2", name: "Premium Gift Wrap", price: 150, description: "Satin ribbon & personalized card" }
    ],
    variants: [
      {
        id: "variant-1",
        name: "Case Material",
        options: [
          { id: "o1", name: "Standard White" },
          { id: "o2", name: "Carbon Fiber", priceModifier: 1500 },
          { id: "o3", name: "Clear Glass", priceModifier: 1000 }
        ]
      }
    ]
  },
  {
    id: PRODUCT_2_ID,
    vendorId: VENDOR_1_ID,
    name: "Custom Leather Phone Case",
    price: 1899,
    description: "Hand-stitched Italian leather case with foil-stamped initials. Slim profile, microfiber lining, and raised edges for screen protection.",
    image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbab",
    images: [
      "https://images.unsplash.com/photo-1601784551446-20c9e07cdbab",
      "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3"
    ],
    category: "Accessories",
    specs: [
      { label: "Leather Type", value: "Top-grain Italian" },
      { label: "Thickness", value: "1.2mm" },
      { label: "Weight", value: "28g" }
    ],
    materials: ["Top-grain Leather", "Microfiber"],
    careInstructions: "Apply leather conditioner every 6 months.",
    addOns: [
      { id: "a3", name: "Initials Stamping", price: 200, description: "Max 3 letters" }
    ],
    variants: [
      {
        id: "variant-2",
        name: "Leather Color",
        options: [
          { id: "o4", name: "Tan Brown" },
          { id: "o5", name: "Midnight Black" },
          { id: "o6", name: "Forest Green", priceModifier: 100 }
        ]
      },
      {
        id: "variant-3",
        name: "Foil Color",
        options: [
          { id: "o7", name: "Gold" },
          { id: "o8", name: "Silver" },
          { id: "o9", name: "Rose Gold" }
        ]
      }
    ]
  },
  {
    id: PRODUCT_3_ID,
    vendorId: VENDOR_2_ID,
    name: "Hand-Painted Ceramic Mug",
    price: 899,
    description: "Artisan-crafted ceramic mug with your custom artwork or photo. Each mug is individually thrown on the wheel and painted by hand.",
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d",
    images: [
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d",
      "https://images.unsplash.com/photo-1574482620826-40685ca5ede2"
    ],
    category: "Home",
    specs: [
      { label: "Capacity", value: "300ml - 450ml" },
      { label: "Weight", value: "350g" },
      { label: "Dishwasher Safe", value: "Yes" }
    ],
    materials: ["Ceramic Clay", "Non-toxic Glaze"],
    careInstructions: "Microwave and dishwasher safe.",
    addOns: [
      { id: "a4", name: "Photo Printing", price: 300, description: "High-res print on ceramic" }
    ],
    variants: [
      {
        id: "variant-4",
        name: "Size",
        options: [
          { id: "o10", name: "Standard (300ml)" },
          { id: "o11", name: "Large (450ml)", priceModifier: 200 }
        ]
      }
    ]
  },
];

