import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Block } from "@/lib/types";
import type { Breakpoint } from "@/store/breakpoints";

// Mock the heavy renderers so importing Canvas.helpers doesn't pull the real
// BlockRenderer / editor-block subtree (stores, dnd-kit, …). We only test the
// pure helpers here.
vi.mock("@/components/BlockRenderer", () => ({
  BlockRenderer: () => null,
}));
vi.mock("@/components/editor/EditorBlock", () => ({
  SlottedChildren: () => null,
}));

import {
  applyAutoFit,
  contentMotionKey,
  createStartResize,
  deriveCssExtra,
  deriveRenderWidth,
  deriveRenderZoom,
  isDesktopFill,
  measureAvail,
} from "@/components/editor/Canvas.helpers";

function bp(over: Partial<Breakpoint> = {}): Breakpoint {
  return { id: "desktop", label: "Desktop", width: 1280, base: "desktop", ...over };
}

function block(id: string): Block {
  return { id, type: "Section", props: {}, children: [] } as unknown as Block;
}

describe("deriveCssExtra", () => {
  it("returns undefined when not in preview mode", () => {
    expect(deriveCssExtra(false, [block("h")], [block("f")])).toBeUndefined();
  });

  it("concatenates header + footer (in that order) in preview mode", () => {
    const header = [block("h1"), block("h2")];
    const footer = [block("f1")];
    const out = deriveCssExtra(true, header, footer);
    expect(out?.map((b) => b.id)).toEqual(["h1", "h2", "f1"]);
  });

  it("returns a fresh array (not the header reference) in preview mode", () => {
    const header = [block("h")];
    const out = deriveCssExtra(true, header, []);
    expect(out).not.toBe(header);
    expect(out).toEqual(header);
  });
});

describe("isDesktopFill", () => {
  it("is true only for the desktop breakpoint with no drag width", () => {
    expect(isDesktopFill(bp({ id: "desktop" }), null)).toBe(true);
  });

  it("is false when a drag width is active even on desktop", () => {
    expect(isDesktopFill(bp({ id: "desktop" }), 1000)).toBe(false);
  });

  it("is false for non-desktop breakpoints", () => {
    expect(isDesktopFill(bp({ id: "tablet" }), null)).toBe(false);
  });
});

describe("deriveRenderWidth", () => {
  it("rounds the available width when filling desktop", () => {
    expect(deriveRenderWidth(true, 1366.6, bp({ width: 1280 }))).toBe(1367);
  });

  it("falls back to the active width when availW is 0 even if desktopFill", () => {
    expect(deriveRenderWidth(true, 0, bp({ width: 1280 }))).toBe(1280);
  });

  it("uses the active width when not filling desktop", () => {
    expect(deriveRenderWidth(false, 1366, bp({ width: 820 }))).toBe(820);
  });
});

describe("deriveRenderZoom", () => {
  it("forces zoom to 1 when filling desktop", () => {
    expect(deriveRenderZoom(true, 0.5)).toBe(1);
  });

  it("passes the zoom through otherwise", () => {
    expect(deriveRenderZoom(false, 0.5)).toBe(0.5);
  });
});

describe("contentMotionKey", () => {
  it("uses 'page' as a fallback id", () => {
    expect(contentMotionKey(null, false)).toBe("page:edit");
  });

  it("encodes preview vs edit per page id", () => {
    expect(contentMotionKey("p1", true)).toBe("p1:preview");
    expect(contentMotionKey("p1", false)).toBe("p1:edit");
  });
});

describe("measureAvail", () => {
  function elWith(pad: { l: number; r: number; t: number; b: number }, w: number, h: number) {
    const el = document.createElement("div");
    el.style.paddingLeft = `${pad.l}px`;
    el.style.paddingRight = `${pad.r}px`;
    el.style.paddingTop = `${pad.t}px`;
    el.style.paddingBottom = `${pad.b}px`;
    Object.defineProperty(el, "clientWidth", { value: w, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: h, configurable: true });
    return el;
  }

  it("subtracts horizontal/vertical padding and reports width to both setters", () => {
    const el = elWith({ l: 10, r: 6, t: 4, b: 4 }, 500, 300);
    const setAvail = vi.fn();
    const setViewportWidth = vi.fn();
    measureAvail(el as unknown as HTMLDivElement, setAvail, setViewportWidth);
    expect(setAvail).toHaveBeenCalledWith({ w: 500 - 16, h: 300 - 8 });
    expect(setViewportWidth).toHaveBeenCalledWith(500 - 16);
  });
});

describe("applyAutoFit", () => {
  it("no-ops when there is no available width", () => {
    const setZoom = vi.fn();
    const lastFitKey = { current: "stale" };
    applyAutoFit({
      availW: 0,
      desktopFill: false,
      activeId: "tablet",
      activeWidth: 820,
      lastFitKey,
      setZoom,
    });
    expect(setZoom).not.toHaveBeenCalled();
    expect(lastFitKey.current).toBe("stale");
  });

  it("resets the fit key and zooms to 1 when filling desktop", () => {
    const setZoom = vi.fn();
    const lastFitKey = { current: "tablet" };
    applyAutoFit({
      availW: 1000,
      desktopFill: true,
      activeId: "desktop",
      activeWidth: 1280,
      lastFitKey,
      setZoom,
    });
    expect(lastFitKey.current).toBe("");
    expect(setZoom).toHaveBeenCalledWith(1);
  });

  it("fits to width when the breakpoint is wider than the canvas (first time)", () => {
    const setZoom = vi.fn();
    const lastFitKey = { current: "" };
    applyAutoFit({
      availW: 640,
      desktopFill: false,
      activeId: "tablet",
      activeWidth: 1280,
      lastFitKey,
      setZoom,
    });
    expect(lastFitKey.current).toBe("tablet");
    expect(setZoom).toHaveBeenCalledWith(0.5);
  });

  it("zooms to 1 (not the fit) when the breakpoint already fits within ~0.999", () => {
    const setZoom = vi.fn();
    const lastFitKey = { current: "" };
    applyAutoFit({
      availW: 1280,
      desktopFill: false,
      activeId: "tablet",
      activeWidth: 1280,
      lastFitKey,
      setZoom,
    });
    expect(setZoom).toHaveBeenCalledWith(1);
  });

  it("does not re-fit a breakpoint that was already fit (same key)", () => {
    const setZoom = vi.fn();
    const lastFitKey = { current: "tablet" };
    applyAutoFit({
      availW: 640,
      desktopFill: false,
      activeId: "tablet",
      activeWidth: 1280,
      lastFitKey,
      setZoom,
    });
    expect(setZoom).not.toHaveBeenCalled();
    expect(lastFitKey.current).toBe("tablet");
  });
});

describe("createStartResize", () => {
  beforeEach(() => {
    document.body.style.cssText = "";
  });
  afterEach(() => {
    document.body.style.cssText = "";
  });

  function handleEl() {
    const el = document.createElement("div");
    const captured = new Set<number>();
    el.setPointerCapture = vi.fn((id: number) => captured.add(id));
    el.releasePointerCapture = vi.fn((id: number) => captured.delete(id));
    el.hasPointerCapture = vi.fn((id: number) => captured.has(id));
    return el;
  }

  function pointerEvent(el: HTMLElement, clientX: number) {
    return {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      currentTarget: el,
      pointerId: 7,
      clientX,
    } as unknown as React.PointerEvent<HTMLDivElement>;
  }

  it("captures the pointer, flips body styles, and updates drag width on move", () => {
    const setResizeSide = vi.fn();
    const setDragWidth = vi.fn();
    const frameEl = document.createElement("iframe");
    const start = createStartResize({
      active: bp({ base: "desktop", width: 1280 }),
      zoom: 1,
      frame: { el: frameEl, doc: document, body: document.body },
      setResizeSide,
      setDragWidth,
    });

    const handle = handleEl();
    start("right")(pointerEvent(handle, 100));

    expect(handle.setPointerCapture).toHaveBeenCalledWith(7);
    expect(setResizeSide).toHaveBeenCalledWith("right");
    expect(frameEl.style.getPropertyValue("pointer-events")).toBe("none");
    expect(document.body.style.cursor).toBe("ew-resize");

    // Drag right by 40px → width grows by 2*40/zoom = 80 (clamped to the desktop band).
    handle.dispatchEvent(new PointerEvent("pointermove", { clientX: 140 } as PointerEventInit));
    expect(setDragWidth).toHaveBeenLastCalledWith(1280 + 80);

    // Releasing clears the resize state and restores styles.
    handle.dispatchEvent(new PointerEvent("pointerup", {} as PointerEventInit));
    expect(setResizeSide).toHaveBeenLastCalledWith(null);
    expect(frameEl.style.getPropertyValue("pointer-events")).toBe("");
    expect(document.body.style.cursor).toBe("");
    expect(handle.releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it("moves the opposite direction for the left handle and respects zoom", () => {
    const setDragWidth = vi.fn();
    const start = createStartResize({
      active: bp({ base: "desktop", width: 1280 }),
      zoom: 2,
      frame: null,
      setResizeSide: vi.fn(),
      setDragWidth,
    });
    const handle = handleEl();
    start("left")(pointerEvent(handle, 100));

    // Left handle dragged right by 40 → width shrinks: 1280 + (-40*2)/2 = 1240.
    handle.dispatchEvent(new PointerEvent("pointermove", { clientX: 140 } as PointerEventInit));
    expect(setDragWidth).toHaveBeenLastCalledWith(1240);
  });
});
