import type { ReactNode } from "react";

import { Card } from "@/design-system";

interface PlaceholderPageProps {
  /** Which part of CheckMeOut this is, e.g. "Creator dashboard". */
  label: string;
  title: string;
  children?: ReactNode;
}

/** Shared layout for the foundation's placeholder pages. */
export function PlaceholderPage({ label, title, children }: PlaceholderPageProps) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <Card padding="lg" className="w-full max-w-xl">
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">{label}</p>
        <h1 className="mt-1 mb-3 text-3xl font-bold">{title}</h1>
        <div className="flex flex-col gap-3 text-muted">{children}</div>
      </Card>
    </main>
  );
}
