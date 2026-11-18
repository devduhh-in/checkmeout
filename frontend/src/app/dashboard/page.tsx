import type { Metadata } from "next";

import { ApiStatus } from "@/components/ApiStatus";

export const metadata: Metadata = {
  title: "Dashboard · CheckMeOut",
};

export default function DashboardHome() {
  return (
    <main>
      <span className="surface-label">Creator dashboard</span>
      <h1>Dashboard</h1>
      <p>This is where creators will manage their portfolio. Sign-in arrives in Milestone 4.</p>
      <ApiStatus />
    </main>
  );
}
