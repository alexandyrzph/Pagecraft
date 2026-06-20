// Setup for the "dom" Vitest project (jsdom). Adds jest-dom matchers
// (toBeInTheDocument, toHaveValue, …), unmounts rendered trees after each test,
// and stubs browser APIs jsdom lacks but react-aria overlays rely on.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement these; react-aria overlays (Popover/Select/Menu) touch them.
if (!window.matchMedia) {
  // minimal stub
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
}
if (!globalThis.ResizeObserver) {
  // minimal stub
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
