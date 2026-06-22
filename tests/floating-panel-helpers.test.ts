import { describe, it, expect } from "vitest";
import {
  PANEL_WIDTH,
  LEFT_PANEL,
  GAP,
  DOCK_THRESHOLD,
  clampW,
  isInDockZone,
  shouldShow,
  panelStyle,
  type PanelPos,
} from "@/components/editor/inspector/useFloatingPanel.helpers";
import type { Block } from "@/lib/types";

const block = (id = "b1"): Block => ({ id, type: "text", props: {}, styles: {}, children: [] });
const pos: PanelPos = { left: 120, top: 80, maxHeight: 600 };

describe("floating-panel constants", () => {
  it("exposes the documented layout constants", () => {
    expect(PANEL_WIDTH).toBe(304);
    expect(LEFT_PANEL).toBe(256);
    expect(GAP).toBe(14);
    expect(DOCK_THRESHOLD).toBe(60);
  });
});

describe("clampW", () => {
  it("clamps below the minimum to 264", () => {
    expect(clampW(100)).toBe(264);
    expect(clampW(263.9)).toBe(264);
  });
  it("clamps above the maximum to 560", () => {
    expect(clampW(1000)).toBe(560);
    expect(clampW(560.1)).toBe(560);
  });
  it("passes through values inside the band", () => {
    expect(clampW(264)).toBe(264);
    expect(clampW(400)).toBe(400);
    expect(clampW(560)).toBe(560);
  });
});

describe("isInDockZone", () => {
  it("is true strictly past the right-edge band", () => {
    // band starts at vw - DOCK_THRESHOLD = 1000 - 60 = 940
    expect(isInDockZone(941, 1000)).toBe(true);
    expect(isInDockZone(999, 1000)).toBe(true);
  });
  it("is false at or before the band boundary", () => {
    expect(isInDockZone(940, 1000)).toBe(false);
    expect(isInDockZone(500, 1000)).toBe(false);
    expect(isInDockZone(0, 1000)).toBe(false);
  });
});

describe("shouldShow", () => {
  it("shows a floating panel when a block is selected and positioned", () => {
    expect(shouldShow(block(), false, false, false, pos)).toBe(true);
  });
  it("shows when docked even without a measured position", () => {
    expect(shouldShow(block(), false, false, true, null)).toBe(true);
  });
  it("hides without a block", () => {
    expect(shouldShow(null, false, false, true, pos)).toBe(false);
  });
  it("hides in preview mode", () => {
    expect(shouldShow(block(), true, false, false, pos)).toBe(false);
  });
  it("hides while a block drag is active", () => {
    expect(shouldShow(block(), false, true, false, pos)).toBe(false);
  });
  it("hides when floating but not yet positioned", () => {
    expect(shouldShow(block(), false, false, false, null)).toBe(false);
  });
});

describe("panelStyle", () => {
  it("pins to the right rail when docked", () => {
    expect(panelStyle(true, 320, pos)).toEqual({
      position: "fixed",
      top: 56,
      right: 0,
      bottom: 0,
      width: 320,
    });
  });
  it("floats at the effective position when not docked", () => {
    expect(panelStyle(false, 320, pos)).toEqual({
      position: "fixed",
      left: 120,
      top: 80,
      width: 320,
      maxHeight: 600,
    });
  });
  it("falls back to default left/top when no position is available", () => {
    expect(panelStyle(false, 304, null)).toEqual({
      position: "fixed",
      left: 0,
      top: 64,
      width: 304,
      maxHeight: undefined,
    });
  });
});
