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
  /\.(php|aspx?|jsp|cgi|bak|sql|env|sh|bash)$/i,
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Block direct scanning/probing of sensitive root or server files
  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(pathname)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // 2. Server-side Protection for Admin Portal
  // The login route is exactly `/admin` or `/admin/login`
  if (pathname.startsWith("/admin/") && pathname !== "/admin" && pathname !== "/admin/login") {
    const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!adminToken) {
      const loginUrl = new URL("/admin", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Server-side Protection for Customer Account Portal
  if (pathname.startsWith("/account/") || pathname === "/account") {
    const userToken = req.cookies.get(USER_COOKIE_NAME)?.value;
    if (!userToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Continue with request and apply security & cache-control headers
  const response = NextResponse.next();

  // Enforce zero-cache on sensitive data API endpoints
  if (pathname.startsWith("/api/admin/") || pathname.startsWith("/api/user/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  // Security headers reinforcement
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

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
