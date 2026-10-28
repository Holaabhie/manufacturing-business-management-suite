import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export const REFRESH_COOKIE_NAME = "refresh_token";

// ─── Admin-only routes that Staff cannot access ─────────────────
export const ADMIN_ONLY_ROUTES = [
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

export interface RoutingRequest {
  nextUrl: { pathname: string };
  auth?: {
    user?: {
      role?: string;
      company_setup_complete?: boolean;
    };
  } | null;
  cookies: { get: (name: string) => { value: string } | undefined };
  url: string;
}

export function handleAuthRouting(req: RoutingRequest): Response | undefined {
  const { pathname } = req.nextUrl;

  // Check both NextAuth session and custom session cookies
  const hasNextAuth = !!req.auth;
  const hasCustomSession = !!req.cookies.get(SESSION_COOKIE_NAME);
  const hasRefreshToken = !!req.cookies.get(REFRESH_COOKIE_NAME);
  const isLoggedIn = hasNextAuth || hasCustomSession || hasRefreshToken;

  // Redirect logged-in users away from landing page and login pages
  if (
    (pathname === "/" ||
      pathname === "/login" ||
      pathname === "/admin/login" ||
      pathname === "/staff/login") &&
    isLoggedIn
  ) {
    return Response.redirect(new URL("/dashboard", req.url));
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.url));
  }

  // ─── Role-based route protection ──────────────────────────────
  // Block Staff users from accessing admin-only routes
  if (isLoggedIn && hasNextAuth && req.auth) {
    const userRole = req.auth.user?.role;
    if (userRole === "Staff") {
      const isAdminRoute = ADMIN_ONLY_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
      );
      if (isAdminRoute) {
        return Response.redirect(new URL("/access-denied", req.url));
      }
    }
    if (
      userRole === "Admin" &&
      req.auth.user?.company_setup_complete === false &&
      pathname.startsWith("/dashboard")
    ) {
      return Response.redirect(new URL("/setup", req.url));
    }
  }

  return undefined;
}
