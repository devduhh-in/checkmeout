import { RESERVED_USERNAMES } from "@/config/reserved-usernames";

/**
 * Usernames double as subdomains, so they must be valid DNS labels:
 * 3–30 characters, lowercase letters, digits and single hyphens,
 * not starting or ending with a hyphen.
 */
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,29}$/;

export function isValidUsernameFormat(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.has(value);
}

/** True when the value could be a creator's portfolio username. */
export function isPortfolioUsername(value: string): boolean {
  return isValidUsernameFormat(value) && !isReservedUsername(value);
}
