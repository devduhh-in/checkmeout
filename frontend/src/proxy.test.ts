import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

// The proxy reads the real config; with no environment variables set it uses
// the local defaults (localhost, app, http://127.0.0.1:8000).
function run(host: string, path = "/") {
  const request = new NextRequest(`http://${host}${path}`, { headers: { host } });
  const response = proxy(request);
  return { rewrite: response.headers.get("x-middleware-rewrite") };
}

describe("proxy", () => {
  it("rewrites the marketing site", () => {
    expect(run("localhost:3000").rewrite).toBe("http://localhost:3000/marketing");
    expect(run("localhost:3000", "/pricing").rewrite).toBe(
      "http://localhost:3000/marketing/pricing",
    );
  });

  it("rewrites the dashboard", () => {
    expect(run("app.localhost:3000").rewrite).toBe("http://app.localhost:3000/dashboard");
  });

  it("rewrites portfolios", () => {
    expect(run("priya.localhost:3000", "/about").rewrite).toBe(
      "http://priya.localhost:3000/portfolio/priya/about",
    );
  });

  it("forwards dashboard /api requests to the backend, keeping the query", () => {
    expect(run("app.localhost:3000", "/api/health?x=1").rewrite).toBe(
      "http://127.0.0.1:8000/api/health?x=1",
    );
  });

  it("never forwards to another host, even with a crafted path", () => {
    const { rewrite } = run("app.localhost:3000", "/api//evil.example.com/steal");
    expect(new URL(rewrite!).origin).toBe("http://127.0.0.1:8000");
  });

  it("does not forward /api from the marketing site or portfolios", () => {
    expect(run("localhost:3000", "/api/health").rewrite).toBe(
      "http://localhost:3000/marketing/api/health",
    );
    expect(run("priya.localhost:3000", "/api/health").rewrite).toBe(
      "http://priya.localhost:3000/portfolio/priya/api/health",
    );
  });

  it("cannot reach internal folders directly", () => {
    expect(run("localhost:3000", "/dashboard").rewrite).toBe(
      "http://localhost:3000/marketing/dashboard",
    );
    expect(run("priya.localhost:3000", "/portfolio/other").rewrite).toBe(
      "http://priya.localhost:3000/portfolio/priya/portfolio/other",
    );
  });

  it("sends reserved and invalid names to the not-found page", () => {
    expect(run("www.localhost:3000").rewrite).toBe("http://www.localhost:3000/not-found-surface");
    expect(run("admin.localhost:3000").rewrite).toBe(
      "http://admin.localhost:3000/not-found-surface",
    );
    expect(run("bad_name.localhost:3000").rewrite).toBe(
      "http://bad_name.localhost:3000/not-found-surface",
    );
  });
});
