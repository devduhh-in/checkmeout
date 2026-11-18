/**
 * Central frontend configuration.
 *
 * Every domain and URL the app depends on comes from here, read from
 * environment variables with safe defaults for local development.
 * Nothing else in the codebase should read these environment variables directly.
 */

export interface FrontendConfig {
  /** Root domain without port, e.g. "localhost" or "checkmeout.in". */
  rootDomain: string;
  /** Subdomain serving the creator dashboard, e.g. "app". */
  appSubdomain: string;
  /** Origin of the FastAPI backend, e.g. "http://127.0.0.1:8000" (no trailing slash). */
  apiOrigin: string;
  /** Allow /_preview/<username> on hosts outside rootDomain (preview deployments only). */
  enablePreviewPaths: boolean;
}

type Env = Record<string, string | undefined>;

const DEFAULTS = {
  ROOT_DOMAIN: "localhost",
  APP_SUBDOMAIN: "app",
  API_ORIGIN: "http://127.0.0.1:8000",
} as const;

const HOSTNAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
const LABEL_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/** Lowercases a host and removes any ":port" and trailing dot. */
export function normalizeHostname(host: string): string {
  // Strip a numeric ":port" only, so a mistake like "https://checkmeout.in"
  // is left intact and rejected by validation instead of silently becoming "https".
  const hostname = host.trim().toLowerCase().replace(/:\d+$/, "");
  return hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
}

export function readConfig(env: Env = process.env): FrontendConfig {
  const rootDomain = normalizeHostname(env.ROOT_DOMAIN || DEFAULTS.ROOT_DOMAIN);
  if (!HOSTNAME_PATTERN.test(rootDomain)) {
    throw new Error(`ROOT_DOMAIN is not a valid domain: "${env.ROOT_DOMAIN}"`);
  }

  const appSubdomain = (env.APP_SUBDOMAIN || DEFAULTS.APP_SUBDOMAIN).trim().toLowerCase();
  if (!LABEL_PATTERN.test(appSubdomain)) {
    throw new Error(`APP_SUBDOMAIN is not a valid subdomain: "${env.APP_SUBDOMAIN}"`);
  }

  const rawApiOrigin = env.API_ORIGIN || DEFAULTS.API_ORIGIN;
  let apiUrl: URL;
  try {
    apiUrl = new URL(rawApiOrigin);
  } catch {
    throw new Error(`API_ORIGIN is not a valid URL: "${rawApiOrigin}"`);
  }
  if (apiUrl.protocol !== "http:" && apiUrl.protocol !== "https:") {
    throw new Error(`API_ORIGIN must start with http:// or https://: "${rawApiOrigin}"`);
  }

  return {
    rootDomain,
    appSubdomain,
    apiOrigin: apiUrl.origin,
    enablePreviewPaths: env.ENABLE_PREVIEW_PATHS === "true",
  };
}

let cached: FrontendConfig | undefined;

/** Returns the configuration for the running app (read once, then cached). */
export function getConfig(): FrontendConfig {
  cached ??= readConfig();
  return cached;
}
