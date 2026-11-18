import type { ReactNode } from "react";

import { OverlayProvider } from "@/overlays";

import "@/design-system/styles.css";

/**
 * Wraps CheckMeOut's own surfaces (marketing site and dashboard) with the
 * platform design system and overlay system. Creator portfolios don't use
 * this: their themes bring their own styles (see ARCHITECTURE §7).
 */
export function PlatformLayout({ children }: { children: ReactNode }) {
  return <OverlayProvider>{children}</OverlayProvider>;
}
