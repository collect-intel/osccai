import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/polls/:path*",
  "/api/:path*",
  "/api/v1/chat/completions",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/how-it-works",
  "/library",
  "/library/:path*",
  "/community-models/chat/:path*",
  "/community-models/simple-chat/:path*",
  "/community-models/chat(.*)",
  "/(.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico))$",
  "/_next/:path*",
  "/custom",
  "/custom/:path*",
]);

export default clerkMiddleware((auth, req) => {
  if (req.nextUrl.pathname.startsWith("/api/v1/")) {
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    auth().protect();
    return null;
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/v1/chat/completions|_next/static|_next/image|favicon.ico).*)",
  ],
};
