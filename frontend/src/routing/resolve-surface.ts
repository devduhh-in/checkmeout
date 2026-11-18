import { normalizeHostname, type FrontendConfig } from "@/config/env";
import { isPortfolioUsername } from "@/routing/username";

/**
 * Which part of CheckMeOut a request belongs to.
 *
 * This is a pure function (no network, no framework), so every routing rule
 * can be unit-tested. `src/proxy.ts` turns the result into an actual response.
 */
export type Surface =
  | { kind: "marketing" }
  | { kind: "dashboard" }
  | { kind: "portfolio"; username: string; path: string }
  | { kind: "not-found" };

export interface RoutingRequest {
  /** The Host header, e.g. "priya.checkmeout.in" or "app.localhost:3000". */
  host: string | null;
  /** The URL path, e.g. "/" or "/projects/brand-film". */
  pathname: string;
}

const PREVIEW_PATH = /^\/_preview\/([^/]+)(\/.*)?$/;

export function resolveSurface(request: RoutingRequest, config: FrontendConfig): Surface {
  if (!request.host) return { kind: "not-found" };

  const hostname = normalizeHostname(request.host);
  const root = config.rootDomain;

  // checkmeout.in
  if (hostname === root) return { kind: "marketing" };

  // <something>.checkmeout.in
  if (hostname.endsWith(`.${root}`)) {
    const subdomain = hostname.slice(0, -(root.length + 1));

    // Deeper names like a.b.checkmeout.in are never valid.
    if (subdomain.includes(".")) return { kind: "not-found" };
    if (subdomain === config.appSubdomain) return { kind: "dashboard" };
    // Reserved names (www, api, admin…) and malformed names are not portfolios.
    // In production, www → checkmeout.in is a redirect configured on the Vercel
    // domain itself, so it never reaches the app.
    if (!isPortfolioUsername(subdomain)) return { kind: "not-found" };

    return { kind: "portfolio", username: subdomain, path: request.pathname };
  }

  // Any other host, e.g. a Vercel preview URL (checkmeout-abc.vercel.app).
  // Portfolios can be opened by path there, but only when explicitly enabled.
  if (config.enablePreviewPaths) {
    const match = PREVIEW_PATH.exec(request.pathname);
    if (match) {
      const username = match[1].toLowerCase();
      if (!isPortfolioUsername(username)) return { kind: "not-found" };
      return { kind: "portfolio", username, path: match[2] ?? "/" };
    }
  }

  return { kind: "marketing" };
}
