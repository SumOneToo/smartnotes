import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getRateLimitClient } from "@/lib/rate-limit";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/notes(.*)",
  "/api/tags(.*)",
]);

const isApiRoute = createRouteMatcher(["/api/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }

  if (isApiRoute(req)) {
    const { userId } = auth();
    const fallbackIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const identifier = userId ? `user:${userId}` : `ip:${fallbackIp}`;

    const ratelimit = getRateLimitClient();

    if (ratelimit) {
      const result = await ratelimit.limit(identifier);

      if (!result.success) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
