import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't advertise the framework in response headers.
  poweredByHeader: false,
  reactStrictMode: true,
  // Don't let `next dev` write an AGENTS.md file into the project.
  agentRules: false,
};

export default nextConfig;
