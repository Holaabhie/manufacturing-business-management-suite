import NextAuth from "next-auth";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/login", "/api/auth", "/staff/setup", "/access-denied"];
  const isPublicPath = publicPaths.some(path =>
    pathname.startsWith(path)
  );

  // Check both NextAuth session and custom session cookie
  const hasNextAuth = !!req.auth;
  const hasCustomSession = !!req.cookies.get("session_id");
  const isLoggedIn = hasNextAuth || hasCustomSession;

  // Redirect logged in users away from login page
  if (pathname === "/login" && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.url));
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.url));
  }

  return undefined;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

