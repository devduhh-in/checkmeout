import type { Metadata } from "next";

import { ApiStatus } from "@/components/ApiStatus";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Dashboard · CheckMeOut",
};

export default function DashboardHome() {
  return (
    <PlaceholderPage label="Creator dashboard" title="Dashboard">
      <p>This is where creators will manage their portfolio. Sign-in arrives in Milestone 4.</p>
      <ApiStatus />
    </PlaceholderPage>
  );
}
