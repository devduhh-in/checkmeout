import type { ReactNode } from "react";

import { PlatformLayout } from "@/components/PlatformLayout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <PlatformLayout>{children}</PlatformLayout>;
}
