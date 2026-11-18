import { NextResponse, type NextRequest } from "next/server";

import { getConfig } from "@/config/env";
import { resolveSurface } from "@/routing/resolve-surface";

/**
 * Runs before every page request and decides which surface serves it.
 * (Next.js 16 calls this file "proxy"; older versions called it "middleware".)
 *
 * The visitor keeps seeing their original address. Internally the request is
 * rewritten to one of the folders in src/app:
 *
 *   checkmeout.in/…          → /marketing/…
 *   app.checkmeout.in/…      → /dashboard/…
 *   app.checkmeout.in/api/…  → FastAPI backend (API_ORIGIN)
 *   priya.checkmeout.in/…    → /portfolio/priya/…
 *
 * Every path is always prefixed, so the internal folders can never be
 * reached directly from the outside.
 */
export function proxy(request: NextRequest) {
  const settings = getConfig();
  const { pathname, search } = request.nextUrl;
  const surface = resolveSurface({ host: request.headers.get("host"), pathname }, settings);

  switch (surface.kind) {
    case "marketing":
      return rewriteTo(request, `/marketing${suffix(pathname)}`);

    case "dashboard":
      if (pathname === "/api" || pathname.startsWith("/api/")) {
        // Build the target from the configured origin and only replace the
        // path, so a crafted path can never point the request at another host.
        const target = new URL(settings.apiOrigin);
        target.pathname = pathname;
        target.search = search;
        return NextResponse.rewrite(target);
      }
      return rewriteTo(request, `/dashboard${suffix(pathname)}`);

    case "portfolio":
      return rewriteTo(request, `/portfolio/${surface.username}${suffix(surface.path)}`);

    case "not-found":
      return rewriteTo(request, "/not-found-surface");
  }
}

function rewriteTo(request: NextRequest, internalPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = internalPath;
  return NextResponse.rewrite(url);
}

/** "/" becomes "" so "/marketing" + "" stays "/marketing" (no trailing slash). */
function suffix(path: string): string {
  return path === "/" ? "" : path;
}

export const config = {
  // Skip Next.js build assets; everything else goes through the proxy.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
