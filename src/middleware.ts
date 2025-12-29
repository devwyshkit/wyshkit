import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit';
import { applySecurityHeaders } from '@/lib/middleware/security-headers';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware processing for static assets (favicon, images, etc.)
  // This prevents 500 errors on static file requests
  if (
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }
  
  let response = NextResponse.next();
  
  // Handle deep links - preserve query parameters
  // Swiggy Dec 2025 pattern: Smart URL parameter handling
  const url = request.nextUrl.clone();
  const searchParams = url.searchParams;
  
  // Preserve referral codes and other deep link parameters
  if (searchParams.has('ref') || searchParams.has('source') || searchParams.has('orderId')) {
    // Parameters are preserved automatically in NextResponse.next()
    // But we can add custom headers if needed
    response.headers.set('X-Deep-Link', 'true');
  }
  
  // Apply security headers to all responses (except static assets)
  response = applySecurityHeaders(response);
  
  // Rate limiting for API routes (only if enabled via environment variable)
  // Access process.env directly for Edge Runtime compatibility
  const enableRateLimiting = process.env.ENABLE_RATE_LIMITING === 'true';
  
  if (enableRateLimiting && pathname.startsWith('/api/')) {
    // Strict rate limit for auth endpoints
    if (
      pathname.startsWith('/api/auth/send-otp') ||
      pathname.startsWith('/api/auth/verify-otp') ||
      pathname.startsWith('/api/auth/complete-signup')
    ) {
      const rateLimit = checkRateLimit(request, rateLimitConfigs.auth);
      
      if (!rateLimit.allowed) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': rateLimitConfigs.auth.maxRequests.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            },
          }
        );
      }
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', rateLimitConfigs.auth.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimit.resetAt.toString());
    } else if (
      pathname.startsWith('/api/vendors') ||
      pathname.startsWith('/api/products')
    ) {
      // Public API endpoints - lenient rate limit
      const rateLimit = checkRateLimit(request, rateLimitConfigs.public);
      
      if (!rateLimit.allowed) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            },
          }
        );
      }
    } else {
      // Other API endpoints - standard rate limit
      const rateLimit = checkRateLimit(request, rateLimitConfigs.api);
      
      if (!rateLimit.allowed) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            },
          }
        );
      }
    }
  }
  
  // Public routes - no auth required
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/vendors') ||
    pathname.startsWith('/api/products') ||
    pathname.startsWith('/api/auth/send-otp') ||
    pathname.startsWith('/api/auth/verify-otp') ||
    pathname.startsWith('/api/auth/complete-signup') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/(auth)')
  ) {
    return response;
  }

  // NOTE: Auth checks are done in page components using ProtectedRoute and in API routes
  // Middleware only handles public route exclusions and rate limiting
  
  // RBAC for Admin Routes - Swiggy Dec 2025 pattern
  const adminRoutes: Record<string, string[]> = {
    '/admin/vendors/approve': ['super_admin', 'operations_admin'],
    '/admin/settings/commission': ['super_admin'],
    '/admin/orders': ['super_admin', 'operations_admin', 'support_admin'],
    '/admin': ['super_admin', 'operations_admin', 'support_admin', 'admin'],
  };

  const isAdminRoute = pathname.startsWith('/admin');
  if (isAdminRoute) {
    // In a real implementation, we would check the session cookie and role here.
    // For now, we rely on ProtectedRoute in the page components as per the existing pattern.
    // But we add this header to signify it's a role-protected route.
    response.headers.set('X-RBAC-Protected', 'true');
    
    // Check if the specific sub-route has granular role requirements
    const requiredRoles = Object.entries(adminRoutes).find(([route]) => pathname.startsWith(route))?.[1];
    if (requiredRoles) {
      response.headers.set('X-Required-Roles', requiredRoles.join(','));
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};

