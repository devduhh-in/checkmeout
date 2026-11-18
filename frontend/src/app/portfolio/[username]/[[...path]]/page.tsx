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

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { username, path } = await params;

  // The proxy already validates usernames; checking again here means this
  // page can never render for a reserved or malformed name.
  if (!isPortfolioUsername(username)) notFound();

  return (
    <main>
      <span className="surface-label">Public portfolio</span>
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
