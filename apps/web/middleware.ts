import { auth } from "@/auth";
import { handleAuthRouting, type RoutingRequest } from "@/lib/auth-routing";

export default auth((req) => handleAuthRouting(req as unknown as RoutingRequest));

export const config = {
  matcher: ["/((?!_next|static|favicon|brand|.*\\..*).*)"],
};
