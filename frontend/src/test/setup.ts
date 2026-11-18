import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// The simulated browser (jsdom) lacks a few APIs that Radix calls during
// pointer and scroll handling. Real browsers have them; these stand-ins only
// exist in tests.
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

// Unmount rendered components between tests so they don't affect each other.
afterEach(() => {
  if (typeof document !== "undefined") cleanup();
});
