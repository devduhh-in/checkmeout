import { describe, expect, it } from "vitest";

import { normalizeHostname, readConfig } from "@/config/env";

describe("readConfig", () => {
  it("uses safe local defaults when nothing is set", () => {
    expect(readConfig({})).toEqual({
      rootDomain: "localhost",
      appSubdomain: "app",
      apiOrigin: "http://127.0.0.1:8000",
      enablePreviewPaths: false,
    });
  });

  it("reads production-style values", () => {
    const config = readConfig({
      ROOT_DOMAIN: "CheckMeOut.in",
      APP_SUBDOMAIN: "app",
      API_ORIGIN: "https://api.example.com/",
      ENABLE_PREVIEW_PATHS: "true",
    });
    expect(config.rootDomain).toBe("checkmeout.in");
    expect(config.apiOrigin).toBe("https://api.example.com");
    expect(config.enablePreviewPaths).toBe(true);
  });

  it("accepts a root domain with a port and ignores the port", () => {
    expect(readConfig({ ROOT_DOMAIN: "localhost:3000" }).rootDomain).toBe("localhost");
  });

  it("only enables preview paths for the exact value 'true'", () => {
    expect(readConfig({ ENABLE_PREVIEW_PATHS: "yes" }).enablePreviewPaths).toBe(false);
    expect(readConfig({ ENABLE_PREVIEW_PATHS: "1" }).enablePreviewPaths).toBe(false);
  });

  it.each([
    ["ROOT_DOMAIN", "not a domain"],
    ["ROOT_DOMAIN", "https://checkmeout.in"],
    ["APP_SUBDOMAIN", "app.dashboard"],
    ["API_ORIGIN", "localhost:8000"],
    ["API_ORIGIN", "ftp://example.com"],
  ])("rejects invalid %s=%s", (key, value) => {
    expect(() => readConfig({ [key]: value })).toThrow(key);
  });
});

describe("normalizeHostname", () => {
  it.each([
    ["Priya.CheckMeOut.in", "priya.checkmeout.in"],
    ["app.localhost:3000", "app.localhost"],
    ["checkmeout.in.", "checkmeout.in"],
    [" localhost ", "localhost"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeHostname(input)).toBe(expected);
  });
});
