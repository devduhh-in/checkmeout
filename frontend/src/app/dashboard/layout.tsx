import type { ReactNode } from "react";

import { PlatformLayout, platformViewport } from "@/components/PlatformLayout";

export const viewport = platformViewport;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <PlatformLayout>{children}</PlatformLayout>;
}
