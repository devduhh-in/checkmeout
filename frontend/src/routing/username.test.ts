import { describe, expect, it } from "vitest";

import { isPortfolioUsername, isValidUsernameFormat } from "@/routing/username";

describe("username rules", () => {
  it.each(["priya", "abc", "studio-9", "a1b2c3", "x".repeat(30)])("accepts %s", (name) => {
    expect(isPortfolioUsername(name)).toBe(true);
  });

  it.each([
    ["too short", "ab"],
    ["too long", "x".repeat(31)],
    ["uppercase", "Priya"],
    ["leading hyphen", "-priya"],
    ["trailing hyphen", "priya-"],
    ["double hyphen", "pri--ya"],
    ["underscore", "pri_ya"],
    ["dot", "pri.ya"],
    ["space", "pri ya"],
    ["non-ascii", "priyä"],
    ["empty", ""],
  ])("rejects %s (%s)", (_label, name) => {
    expect(isValidUsernameFormat(name)).toBe(false);
  });

  it.each(["www", "app", "api", "admin", "mail", "help", "checkmeout"])(
    "rejects reserved name %s",
    (name) => {
      expect(isValidUsernameFormat(name)).toBe(true);
      expect(isPortfolioUsername(name)).toBe(false);
    },
  );
});
