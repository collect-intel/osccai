import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/polls/:path*",
  "/api/:path*",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/how-it-works",
  "/library",
  "/library/:path*",
  "/(.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico))$",
  "/_next/:path*",
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
    return null;
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)", 
    "/"
  ],
};
