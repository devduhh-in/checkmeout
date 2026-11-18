const FALLBACK = "Something went wrong. Please try again.";

/**
 * Turns anything thrown by an action into a message that is safe to show.
 * Our API's error messages are written for people; anything else gets a
 * friendly generic message.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : FALLBACK;
}
