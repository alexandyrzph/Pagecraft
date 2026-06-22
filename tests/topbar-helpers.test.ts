// Unit tests for the pure helper extracted from <TopBar/>: isComponentMode maps
// every editor mode to whether the bar should render the "component" (Done)
// chrome instead of the page chrome (export / publish).
import { describe, it, expect } from "vitest";
import { isComponentMode, type TopBarMode } from "@/components/editor/TopBar.helpers";

describe("isComponentMode", () => {
  it("treats page mode as the page editor", () => {
    expect(isComponentMode("page")).toBe(false);
  });

  it.each<TopBarMode>(["component", "site", "collection"])(
    "treats %s mode as a component-style editor",
    (mode) => {
      expect(isComponentMode(mode)).toBe(true);
    },
  );
});
