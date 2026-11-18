/**
 * Subdomains that can never become a creator's username.
 *
 * They are either used by the platform itself (app, api, www…), could be
 * confused with official pages (admin, support, billing…), or are common
 * infrastructure names (mail, cdn, ns1…).
 *
 * When usernames become claimable (Milestone 6) the backend must enforce the
 * same list; it will become the single source of truth then.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // Platform surfaces
  "www",
  "app",
  "api",
  "admin",
  "dashboard",
  "preview",
  // Account and product pages
  "login",
  "logout",
  "signin",
  "signup",
  "register",
  "auth",
  "account",
  "accounts",
  "settings",
  "billing",
  "pricing",
  "checkout",
  "onboarding",
  // Help and company pages
  "help",
  "support",
  "docs",
  "blog",
  "about",
  "contact",
  "status",
  "legal",
  "terms",
  "privacy",
  "security",
  "careers",
  "press",
  // Infrastructure
  "mail",
  "email",
  "smtp",
  "imap",
  "pop",
  "ftp",
  "ns1",
  "ns2",
  "cdn",
  "static",
  "assets",
  "media",
  "img",
  "images",
  "files",
  "uploads",
  // Environments
  "dev",
  "staging",
  "test",
  "demo",
  "beta",
  "localhost",
  // Brand
  "checkmeout",
]);
