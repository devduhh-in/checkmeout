import { describe, expect, it } from "vitest";

import { viewport as dashboardViewport } from "@/app/dashboard/layout";
import { viewport as marketingViewport } from "@/app/marketing/layout";
import { platformViewport } from "@/components/PlatformLayout";

describe("platform viewport", () => {
  // Without viewport-fit=cover, iPhones report safe-area insets as 0 and
  // bottom sheets would sit underneath the home indicator.
  it("opts in to safe areas so overlays can avoid the iPhone home indicator", () => {
    expect(platformViewport.viewportFit).toBe("cover");
  });

  it("is used by the marketing site and the dashboard", () => {
    expect(marketingViewport).toBe(platformViewport);
    expect(dashboardViewport).toBe(platformViewport);
  });
});
