import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Define protected and public routes
const protectedRoutes = ["/dashboard", "/documents", "/quizzes", "/analytics"];
const publicRoutes = ["/login", "/signup", "/"];

// Public API routes (no auth required)
const publicApiRoutes = ["/api/auth/callback"];

// Allowed localhost patterns for CORS protection
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

const ALLOWED_ORIGINS = [
  "http://localhost",
  "http://127.0.0.1",
  "https://localhost",
  "https://127.0.0.1",
  ...(NEXT_PUBLIC_APP_URL ? [NEXT_PUBLIC_APP_URL] : []),
];

/**
 * Check if the request origin is from an allowed origin (localhost or NEXT_PUBLIC_APP_URL)
 */
function isAllowedOrigin(request: NextRequest): boolean {
  // Check Origin header (most reliable for CORS)
  const origin = request.headers.get("origin");
  if (origin) {
    return ALLOWED_ORIGINS.some((pattern) => origin.startsWith(pattern));
  }

  // Check Referer header (fallback)
  const referer = request.headers.get("referer");
  if (referer) {
    return ALLOWED_ORIGINS.some((pattern) => referer.startsWith(pattern));
  }

  // Check Host header (last resort, only for localhost-like values or app URL host)
  const host = request.headers.get("host");
  if (host) {
    const isLocal =
      host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const isAppUrlHost =
      typeof NEXT_PUBLIC_APP_URL === "string" &&
      NEXT_PUBLIC_APP_URL.trim() !== "" &&
      host.startsWith(new URL(NEXT_PUBLIC_APP_URL).host);
    return isLocal || isAppUrlHost;
  }

  // In development with same-origin requests, headers might not be present
  // Allow if no origin header in development mode
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return false;
}

/**
 * Check if route is an API route
 */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/**
 * Check if API route is public (no auth required)
 */
function isPublicApiRoute(pathname: string): boolean {
  return publicApiRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if the current route is protected or public
  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
  const isPublicRoute = publicRoutes.includes(path);
  const apiRoute = isApiRoute(path);

  // ============================================================================
  // CORS PROTECTION: Localhost-only validation
  // ============================================================================

  // Skip CORS check for public non-API routes (login, signup, home)
  if (isPublicRoute && !apiRoute) {
    // Still need to update session for public pages
    const { user, supabaseResponse } = await updateSession(request);

    // Redirect authenticated users away from login/signup
    if (user && (path === "/login" || path === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return supabaseResponse;
  }

  // Validate allowed origin for all other requests
  if (!isAllowedOrigin(request)) {
    console.warn(`[CORS] Blocked non-allowed origin request to ${path}`);

    if (apiRoute) {
      // API routes: return 403 JSON
      return NextResponse.json(
        { error: "Forbidden: Request must originate from localhost" },
        { status: 403 }
      );
    } else {
      // Page routes: redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ============================================================================
  // AUTHENTICATION: Check user session
  // ============================================================================

  // Update Supabase session and get user
  const { user, supabaseResponse } = await updateSession(request);

  // Handle API routes
  if (apiRoute) {
    // Allow public API routes
    if (isPublicApiRoute(path)) {
      return supabaseResponse;
    }

    // Require authentication for all other API routes
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return supabaseResponse;
  }

  // Handle protected page routes
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from login/signup
  if (isPublicRoute && user && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

// Routes Proxy should NOT run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Public assets (images, fonts, etc.)
     *
     * NOTE: Removed "api" from exclusion list to protect API routes
     */
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
