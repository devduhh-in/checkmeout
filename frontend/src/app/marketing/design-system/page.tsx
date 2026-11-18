import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getConfig } from "@/config/env";

import { Showcase } from "./Showcase";

export const metadata: Metadata = {
  title: "Design system · CheckMeOut",
};

// Decided per request so the same build behaves correctly in each environment.
export const dynamic = "force-dynamic";

/**
 * Internal page for reviewing every design-system component and overlay.
 * Only available locally and on preview deployments, never in production.
 */
export default function DesignSystemPage() {
  if (!getConfig().showInternalTools) notFound();
  return <Showcase />;
}
