import { describe, expect, it } from "vitest";

import { readConfig } from "@/config/env";
import { resolveSurface } from "@/routing/resolve-surface";

const local = readConfig({});
const production = readConfig({ ROOT_DOMAIN: "checkmeout.in" });
const preview = readConfig({ ROOT_DOMAIN: "checkmeout.in", ENABLE_PREVIEW_PATHS: "true" });

const resolve = (host: string | null, pathname = "/", config = local) =>
  resolveSurface({ host, pathname }, config);

describe("resolveSurface — local development", () => {
  it("serves marketing on localhost:3000", () => {
    expect(resolve("localhost:3000")).toEqual({ kind: "marketing" });
  });

  it("serves the dashboard on app.localhost:3000", () => {
    expect(resolve("app.localhost:3000")).toEqual({ kind: "dashboard" });
  });

  it("serves a portfolio on priya.localhost:3000", () => {
    expect(resolve("priya.localhost:3000", "/projects/one")).toEqual({
      kind: "portfolio",
      username: "priya",
      path: "/projects/one",
    });
  });

  it("works on any port", () => {
    expect(resolve("priya.localhost:4321")).toMatchObject({ kind: "portfolio" });
    expect(resolve("localhost")).toEqual({ kind: "marketing" });
  });
});

describe("resolveSurface — production", () => {
  it.each([
    ["checkmeout.in", { kind: "marketing" }],
    ["app.checkmeout.in", { kind: "dashboard" }],
    ["priya.checkmeout.in", { kind: "portfolio", username: "priya", path: "/" }],
  ])("%s", (host, expected) => {
    expect(resolve(host, "/", production)).toEqual(expected);
  });

  it("treats hostnames case-insensitively", () => {
    expect(resolve("PRIYA.CheckMeOut.in", "/", production)).toMatchObject({
      kind: "portfolio",
      username: "priya",
    });
    expect(resolve("APP.checkmeout.in", "/", production)).toEqual({ kind: "dashboard" });
  });

  it("accepts a trailing dot in the host", () => {
    expect(resolve("priya.checkmeout.in.", "/", production)).toMatchObject({
      kind: "portfolio",
    });
  });
});

describe("resolveSurface — edge cases", () => {
  it.each(["www", "api", "admin", "mail", "help", "dashboard", "checkmeout"])(
    "reserved subdomain %s → not found",
    (name) => {
      expect(resolve(`${name}.checkmeout.in`, "/", production)).toEqual({ kind: "not-found" });
    },
  );

  it.each([
    ["too short", "ab"],
    ["underscore", "bad_name"],
    ["leading hyphen", "-priya"],
    ["double hyphen", "pri--ya"],
  ])("invalid username (%s) → not found", (_label, name) => {
    expect(resolve(`${name}.checkmeout.in`, "/", production)).toEqual({ kind: "not-found" });
  });

  it("nested subdomains → not found", () => {
    expect(resolve("a.priya.checkmeout.in", "/", production)).toEqual({ kind: "not-found" });
    expect(resolve("x.app.localhost:3000")).toEqual({ kind: "not-found" });
  });

  it("missing Host header → not found", () => {
    expect(resolve(null)).toEqual({ kind: "not-found" });
  });

  it("does not treat look-alike domains as ours", () => {
    // "evilcheckmeout.in" ends with "checkmeout.in" but is a different domain.
    expect(resolve("evilcheckmeout.in", "/", production)).toEqual({ kind: "marketing" });
    expect(resolve("priya.checkmeout.in.evil.com", "/", production)).toEqual({
      kind: "marketing",
    });
  });
});

describe("resolveSurface — preview deployments", () => {
  const host = "checkmeout-abc123.vercel.app";

  it("opens a portfolio by path when preview paths are enabled", () => {
    expect(resolve(host, "/_preview/priya", preview)).toEqual({
      kind: "portfolio",
      username: "priya",
      path: "/",
    });
    expect(resolve(host, "/_preview/priya/projects/one", preview)).toEqual({
      kind: "portfolio",
      username: "priya",
      path: "/projects/one",
    });
  });

  it("still rejects reserved or invalid names on preview paths", () => {
    expect(resolve(host, "/_preview/admin", preview)).toEqual({ kind: "not-found" });
    expect(resolve(host, "/_preview/a_b", preview)).toEqual({ kind: "not-found" });
  });

  it("ignores preview paths when the setting is off", () => {
    expect(resolve(host, "/_preview/priya", production)).toEqual({ kind: "marketing" });
  });

  it("ignores preview paths on the real domain even when enabled", () => {
    expect(resolve("checkmeout.in", "/_preview/priya", preview)).toEqual({ kind: "marketing" });
  });

  it("shows marketing for other paths on preview hosts", () => {
    expect(resolve(host, "/", preview)).toEqual({ kind: "marketing" });
  });
});
