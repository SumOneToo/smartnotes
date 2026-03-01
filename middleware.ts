import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)", "/api/notes(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (isDashboardRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
