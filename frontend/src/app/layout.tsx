import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

// Downloaded at build time and served from our own site (no requests to Google
// from visitors' browsers). Exposed as a CSS variable used by the design tokens.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CheckMeOut",
  description: "Build and publish your professional portfolio without code.",
  // Foundation placeholders only: keep search engines out until launch.
  robots: { index: false, follow: false },
};

/**
 * The bare page wrapper shared by every surface. Styling lives in each
 * surface's own layout so portfolio themes are never forced into the
 * platform's look.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
