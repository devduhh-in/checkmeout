import { notFound } from "next/navigation";

/**
 * Target for addresses the proxy rejects (reserved names, invalid usernames,
 * unknown subdomains). Always responds with the 404 page and a 404 status.
 */
export default function NotFoundSurface() {
  notFound();
}
