import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/invite/(.*)",
  "/rejected",
  "/api/(.*)",
]);

export const middleware = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isAuth = await convexAuth.isAuthenticated();

  if (!isPublicRoute(request) && !isAuth) {
    return nextjsMiddlewareRedirect(request, "/login");
  }

  if (isAuth) {
    if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register") {
      return nextjsMiddlewareRedirect(request, "/");
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
};
