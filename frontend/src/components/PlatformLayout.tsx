import type { Viewport } from "next";
import type { ReactNode } from "react";

import { OverlayProvider } from "@/overlays";

import "@/design-system/styles.css";

/**
 * Viewport settings for platform pages. `viewportFit: "cover"` lets iPhones
 * report their safe areas (notch, home indicator) so bottom sheets, drawers
 * and toasts can pad themselves clear of them. Without it those insets are 0.
 */
export const platformViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Wraps CheckMeOut's own surfaces (marketing site and dashboard) with the
 * platform design system and overlay system. Creator portfolios don't use
 * this: their themes bring their own styles (see ARCHITECTURE §7).
 */
export function PlatformLayout({ children }: { children: ReactNode }) {
  return <OverlayProvider>{children}</OverlayProvider>;
}
