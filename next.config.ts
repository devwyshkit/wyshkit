import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

const nextConfig: NextConfig = {
  // Instrumentation is enabled by default in Next.js 15 via instrumentation.ts
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'slelguoygbfzlpylpxfs.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Swiggy Dec 2025 pattern: Disable image optimization in dev to avoid Turbopack 404s
    // Production will use optimized images for better performance
    unoptimized: process.env.NODE_ENV === 'development',
    // Ensure image optimization works in development
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  typescript: {
    // Swiggy Dec 2025 pattern: Don't hide errors in development - catch them early
    // Only ignore in production if absolutely necessary for deployment
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    // Swiggy Dec 2025 pattern: Don't hide ESLint errors in development - catch them early
    // Only ignore in production if absolutely necessary for deployment
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  turbopack: {
    rules: {
      "*.{jsx,tsx}": {
        loaders: [LOADER]
      }
    }
  }
};

export default nextConfig;
