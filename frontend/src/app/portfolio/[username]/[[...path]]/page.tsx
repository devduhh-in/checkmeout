import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isPortfolioUsername } from "@/routing/username";

interface PortfolioPageProps {
  params: Promise<{ username: string; path?: string[] }>;
}

export async function generateMetadata({ params }: PortfolioPageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `${username} · CheckMeOut` };
}

/**
 * Placeholder until themes arrive (Milestone 7). Deliberately not styled with
 * the platform design system: portfolios are rendered by their theme.
 */
export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { username, path } = await params;

  // The proxy already validates usernames; checking again here means this
  // page can never render for a reserved or malformed name.
  if (!isPortfolioUsername(username)) notFound();

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 560,
        margin: "15vh auto",
        padding: 16,
      }}
    >
      <p
        style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}
      >
        Public portfolio
      </p>
      <h1>Portfolio for: {username}</h1>
      <p>
        Requested page: <code>/{path?.join("/") ?? ""}</code>
      </p>
      <p>
        <small>
          Placeholder. Real portfolios are rendered by themes, starting with Social in Milestone 7.
        </small>
      </p>
    </main>
  );
}
