import { describe, it, expect } from "vitest";
import { blockChromeLabel } from "@/components/editor/CanvasOverlay.helpers";

describe("blockChromeLabel", () => {
  it("returns the component's name for a component instance", () => {
    expect(blockChromeLabel(true, { name: "Hero Card" }, undefined, "component")).toBe("Hero Card");
  });

  it("falls back to 'Component' when the component has no name", () => {
    expect(blockChromeLabel(true, {}, undefined, "component")).toBe("Component");
  });

  it("falls back to 'Component' when the component is missing", () => {
    expect(blockChromeLabel(true, undefined, { label: "ignored" }, "component")).toBe("Component");
  });

  it("returns the block definition's label for a normal block", () => {
    expect(blockChromeLabel(false, undefined, { label: "Heading" }, "heading")).toBe("Heading");
  });

  it("falls back to the raw block type when the definition has no label", () => {
    expect(blockChromeLabel(false, undefined, {}, "heading")).toBe("heading");
  });

  it("falls back to the raw block type when the definition is missing", () => {
    expect(blockChromeLabel(false, { name: "ignored" }, undefined, "text")).toBe("text");
  });
});
