import { auth } from "@/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

const REFRESH_COOKIE_NAME = "refresh_token";

// ─── Admin-only routes that Staff cannot access ─────────────────
const ADMIN_ONLY_ROUTES = [
  "/dashboard/analytics",
  "/dashboard/billing",
  "/dashboard/payments",
  "/dashboard/users",
  "/dashboard/audit",
  "/dashboard/upgrade",
  "/dashboard/machines",
  "/dashboard/clients",
  "/dashboard/assistant",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = [
    "/login",
    "/admin/login",
    "/staff/login",
    "/api/auth",
    "/staff/setup",
    "/access-denied",
  ];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Check both NextAuth session and custom session cookies
  const hasNextAuth = !!req.auth;
  const hasCustomSession = !!req.cookies.get(SESSION_COOKIE_NAME);
  const hasRefreshToken = !!req.cookies.get(REFRESH_COOKIE_NAME);
  const isLoggedIn = hasNextAuth || hasCustomSession || hasRefreshToken;

  // Redirect logged-in users away from login pages
  if ((pathname === "/login" || pathname === "/admin/login" || pathname === "/staff/login") && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.url));
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.url));
  }

  // ─── Role-based route protection ──────────────────────────────
  // Block Staff users from accessing admin-only routes
  if (isLoggedIn && hasNextAuth && req.auth) {
    const userRole = (req.auth as any)?.user?.role;
    if (userRole === "Staff") {
      const isAdminRoute = ADMIN_ONLY_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
      );
      if (isAdminRoute) {
        return Response.redirect(new URL("/access-denied", req.url));
      }
    }
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!_next|static|favicon|.*\\..*).*)"],
};
