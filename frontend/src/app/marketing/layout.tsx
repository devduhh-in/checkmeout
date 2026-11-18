import type { ReactNode } from "react";

import { PlatformLayout } from "@/components/PlatformLayout";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <PlatformLayout>{children}</PlatformLayout>;
}
