import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE_NAME = process.env.ADMIN_SESSION_COOKIE || "premikeys_admin_session";
const USER_COOKIE_NAME = "premikeys_user_session";

// Block direct probes for sensitive files and system directories
const FORBIDDEN_FILE_PATTERNS = [
  /^\/\.env/i,
  /^\/INITIAL_ADMIN_SETUP\.json/i,
  /^\/\.git/i,
  /^\/\.next/i,
  /^\/node_modules/i,
  /^\/prisma/i,
  /^\/scripts/i,
  /^\/storage/i,
  /\.(php|aspx?|jsp|cgi|bak|sql|env|sh|bash|db|sqlite)$/i,
];

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_EXEMPT_PATHS = new Set(["/api/telegram/webhook"]);

function getAllowedHosts(req: NextRequest): Set<string> {
  const allowed = new Set<string>();
  const hostHeader = req.headers.get("host")?.trim().toLowerCase();
  if (hostHeader) allowed.add(hostHeader);

  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  if (forwardedHost) allowed.add(forwardedHost);

  if (req.nextUrl.host) {
    allowed.add(req.nextUrl.host.toLowerCase());
  }

  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envSiteUrl) {
    try {
      const parsed = new URL(envSiteUrl);
      allowed.add(parsed.host.toLowerCase());
    } catch {
      // ignore invalid URL
    }
  }
  return allowed;
}

function verifyCsrfRequest(req: NextRequest): { valid: boolean; reason?: string } {
  const secFetchSite = req.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (secFetchSite === "cross-site") {
    return { valid: false, reason: "Cross-site state-changing request rejected (Sec-Fetch-Site)." };
  }

  const allowedHosts = getAllowedHosts(req);
  const originHeader = req.headers.get("origin")?.trim();

  if (originHeader) {
    if (originHeader === "null") {
      return { valid: false, reason: "Null Origin rejected for state-changing request." };
    }
    try {
      const originHost = new URL(originHeader).host.toLowerCase();
      if (!allowedHosts.has(originHost)) {
        return { valid: false, reason: `Untrusted Origin host: ${originHost}` };
      }
    } catch {
      return { valid: false, reason: "Malformed Origin header." };
    }
    return { valid: true };
  }

  const refererHeader = req.headers.get("referer")?.trim();
  if (refererHeader) {
    try {
      const refererHost = new URL(refererHeader).host.toLowerCase();
      if (!allowedHosts.has(refererHost)) {
        return { valid: false, reason: `Untrusted Referer host: ${refererHost}` };
      }
    } catch {
      return { valid: false, reason: "Malformed Referer header." };
    }
  }

  return { valid: true };
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Block direct scanning/probing of sensitive root or server files
  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(pathname)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // 2. Centralized CSRF & Origin Validation on State-Changing API Requests
  if (
    pathname.startsWith("/api/") &&
    STATE_CHANGING_METHODS.has(req.method.toUpperCase()) &&
    !CSRF_EXEMPT_PATHS.has(pathname)
  ) {
    const csrfCheck = verifyCsrfRequest(req);
    if (!csrfCheck.valid) {
      return NextResponse.json(
        { error: "Forbidden: Cross-Site Request Forgery (CSRF) protection triggered." },
        { status: 403 }
      );
    }
  }

  // Handle CORS preflight strictly (same-origin only, never wildcard with credentials)
  if (pathname.startsWith("/api/") && req.method.toUpperCase() === "OPTIONS") {
    const originHeader = req.headers.get("origin")?.trim();
    const allowedHosts = getAllowedHosts(req);
    if (originHeader) {
      try {
        const originHost = new URL(originHeader).host.toLowerCase();
        if (!allowedHosts.has(originHost)) {
          return new NextResponse("Forbidden Origin", { status: 403 });
        }
      } catch {
        return new NextResponse("Bad Origin", { status: 400 });
      }
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  // 3. Server-side Protection for Admin Portal
  // The login route is exactly `/admin` or `/admin/login`
  if (pathname.startsWith("/admin/") && pathname !== "/admin" && pathname !== "/admin/login") {
    const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!adminToken) {
      const loginUrl = new URL("/admin", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Server-side Protection for Customer Account Portal
  if (pathname.startsWith("/account/") || pathname === "/account") {
    const userToken = req.cookies.get(USER_COOKIE_NAME)?.value;
    if (!userToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 5. Continue with request and apply security & cache-control headers
  const response = NextResponse.next();

  // Enforce zero-cache on sensitive data API endpoints & authenticated pages
  if (
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/user/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/orders/") ||
    pathname.startsWith("/api/refunds/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/account")
  ) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  // Security headers reinforcement
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static build files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.png, apple-icon.png (public favicons)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png).*)",
  ],
};
