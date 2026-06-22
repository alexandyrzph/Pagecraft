import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { useFloatingPanel } from "@/components/editor/inspector/useFloatingPanel";
import {
  positionFor,
  measurePos,
  undockedPos,
  dragMovePos,
  setFramePassthrough,
} from "@/components/editor/inspector/useFloatingPanel.helpers";
import { IframeProvider, type FrameInfo } from "@/components/editor/iframe-context";
import { DragProvider, type DragInfo } from "@/components/editor/drag-context";
import { useEditor } from "@/store/editor-store";
import { useCanvasZoom } from "@/store/canvas-zoom";

function setViewportSize(w: number, h: number) {
  Object.defineProperty(window, "innerWidth", { value: w, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: h, configurable: true });
}

function rect(over: Partial<DOMRect>): DOMRect {
  return {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...over,
  } as DOMRect;
}

const created: HTMLElement[] = [];

function addBlockEl(id: string, r: Partial<DOMRect>) {
  const el = document.createElement("div");
  el.setAttribute("data-block-id", id);
  el.getBoundingClientRect = () => rect(r);
  document.body.appendChild(el);
  created.push(el);
  return el;
}

function seedSelected() {
  useEditor.getState().init({ id: "p1", title: "T", slug: "t", published: false, tree: [] });
  useEditor.getState().addBlock("text", null, 0);
  const realId = useEditor.getState().tree[0].id;
  useEditor.getState().select(realId);
  return realId;
}

function move(x: number, y: number) {
  window.dispatchEvent(new MouseEvent("pointermove", { clientX: x, clientY: y }));
}
function up(x: number, y: number) {
  window.dispatchEvent(new MouseEvent("pointerup", { clientX: x, clientY: y }));
}

type Wrapper = ({ children }: { children: ReactNode }) => ReactNode;

function makeWrapper(frame: FrameInfo | null, drag: DragInfo): Wrapper {
  return function W({ children }: { children: ReactNode }) {
    return (
      <IframeProvider value={{ frame, tick: 0, register: () => {}, bump: () => {} }}>
        <DragProvider value={drag}>{children}</DragProvider>
      </IframeProvider>
    );
  };
}

const noDrag: DragInfo = { type: null, id: null, invalid: new Set(), ghost: null };

beforeEach(() => {
  setViewportSize(1200, 900);
  useCanvasZoom.getState().reset();
});

afterEach(() => {
  for (const el of created.splice(0)) el.remove();
  vi.restoreAllMocks();
  useEditor.setState({ selectedId: null, selectedIds: [], tree: [], previewMode: false });
});

describe("positionFor (top-document anchoring)", () => {
  it("anchors to the right of the block when there is room", () => {
    const el = addBlockEl("x", { top: 200, left: 300, right: 500 });
    const p = positionFor(el, null, 1, 304);
    // right + GAP = 500 + 14
    expect(p.left).toBe(514);
    expect(p.top).toBe(200);
    expect(p.maxHeight).toBe(900 - 200 - 16);
  });

  it("anchors to the left when the right side would overflow", () => {
    const el = addBlockEl("x", { top: 100, left: 700, right: 1190 });
    const p = positionFor(el, null, 1, 304);
    // left - GAP - width = 700 - 14 - 304
    expect(p.left).toBe(382);
  });

  it("pins to the right edge when neither side fits", () => {
    const el = addBlockEl("x", { top: 100, left: 300, right: 1100 });
    const p = positionFor(el, null, 1, 304);
    // vw - width - 8 = 1200 - 304 - 8
    expect(p.left).toBe(888);
  });

  it("clamps top to the [64, vh-360] band", () => {
    const high = addBlockEl("h", { top: 0, left: 10, right: 50 });
    expect(positionFor(high, null, 1, 304).top).toBe(64);
    const low = addBlockEl("l", { top: 5000, left: 10, right: 50 });
    expect(positionFor(low, null, 1, 304).top).toBe(900 - 360);
  });

  it("scales an in-frame rect by the canvas zoom and offsets by the iframe", () => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    created.push(iframe);
    iframe.getBoundingClientRect = () => rect({ left: 100, top: 50 });
    const frame: FrameInfo = { el: iframe, doc: document, body: document.body };
    const el = addBlockEl("z", { top: 10, left: 20, right: 60 });
    const p = positionFor(el, frame, 2, 304);
    // right: 60*2 + 100 = 220 -> +GAP fits (220+14+304 <= 1192)
    expect(p.left).toBe(234);
    // top: 10*2 + 50 = 70
    expect(p.top).toBe(70);
  });
});

describe("measurePos", () => {
  it("returns null when no element matches the selected id", () => {
    expect(measurePos("missing", null, 1, 304)).toBeNull();
  });
  it("returns null for a null selection (empty-id query matches nothing)", () => {
    expect(measurePos(null, null, 1, 304)).toBeNull();
  });
  it("measures the matching element", () => {
    addBlockEl("sel", { top: 120, left: 200, right: 360 });
    const p = measurePos("sel", null, 1, 304);
    expect(p).not.toBeNull();
    expect(p?.left).toBe(360 + 14);
  });
});

describe("undockedPos / dragMovePos / setFramePassthrough", () => {
  it("pops a docked panel out near the right edge", () => {
    expect(undockedPos(1200, 304)).toEqual({ left: 1200 - 304 - 16, top: 72, maxHeight: 900 - 88 });
  });
  it("clamps the popped-out left to a minimum of 8", () => {
    expect(undockedPos(10, 304).left).toBe(8);
  });
  it("offsets the drag by the pointer delta and clamps to the viewport", () => {
    const start = { x: 100, y: 100, left: 400, top: 300 };
    const p = dragMovePos({ clientX: 150, clientY: 140 } as PointerEvent, start, 1200, 304);
    expect(p.left).toBe(450);
    expect(p.top).toBe(340);
    expect(p.maxHeight).toBe(900 - 340 - 16);
  });
  it("clamps the drag to the left/top minimums", () => {
    const start = { x: 100, y: 100, left: 8, top: 56 };
    const p = dragMovePos({ clientX: 0, clientY: 0 } as PointerEvent, start, 1200, 304);
    expect(p.left).toBe(8);
    expect(p.top).toBe(56);
  });
  it("toggles iframe pointer-events and is a no-op without a frame", () => {
    const iframe = document.createElement("iframe");
    const frame: FrameInfo = { el: iframe, doc: document, body: document.body };
    setFramePassthrough(frame, true);
    expect(iframe.style.pointerEvents).toBe("none");
    setFramePassthrough(frame, false);
    expect(iframe.style.pointerEvents).toBe("");
    expect(() => setFramePassthrough(null, true)).not.toThrow();
  });
});

describe("useFloatingPanel", () => {
  it("shows and anchors the panel for a selected block", () => {
    seedSelected();
    const id = useEditor.getState().selectedId as string;
    addBlockEl(id, { top: 150, left: 200, right: 360 });
    const { result } = renderHook(() => useFloatingPanel(), {
      wrapper: makeWrapper(null, noDrag),
    });
    expect(result.current.show).toBe(true);
    expect(result.current.block?.id).toBe(id);
    expect(result.current.style.left).toBe(360 + 14);
    expect(result.current.width).toBe(304);
    expect(result.current.docked).toBe(false);
  });

  it("hides in preview mode", () => {
    seedSelected();
    const id = useEditor.getState().selectedId as string;
    addBlockEl(id, { top: 150, left: 200, right: 360 });
    useEditor.setState({ previewMode: true });
    const { result } = renderHook(() => useFloatingPanel(), {
      wrapper: makeWrapper(null, noDrag),
    });
    expect(result.current.show).toBe(false);
  });

  it("hides while a block drag is active", () => {
    seedSelected();
    const id = useEditor.getState().selectedId as string;
    addBlockEl(id, { top: 150, left: 200, right: 360 });
    const drag: DragInfo = { type: "text", id: null, invalid: new Set(), ghost: null };
    const { result } = renderHook(() => useFloatingPanel(), {
      wrapper: makeWrapper(null, drag),
    });
    expect(result.current.show).toBe(false);
  });

  it("toggleDock flips docked state and produces the rail style", () => {
    seedSelected();
    const id = useEditor.getState().selectedId as string;
    addBlockEl(id, { top: 150, left: 200, right: 360 });
    const { result } = renderHook(() => useFloatingPanel(), {
      wrapper: makeWrapper(null, noDrag),
    });
    act(() => result.current.toggleDock());
    expect(result.current.docked).toBe(true);
    expect(result.current.style).toMatchObject({ position: "fixed", right: 0, width: 304 });
  });

  it("ESC deselects the current block", () => {
    seedSelected();
    addBlockEl(useEditor.getState().selectedId as string, { top: 10, left: 10, right: 50 });
    renderHook(() => useFloatingPanel(), { wrapper: makeWrapper(null, noDrag) });
    expect(useEditor.getState().selectedId).not.toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(useEditor.getState().selectedId).toBeNull();
  });

  it("drag-to-move updates dragging + position and docks past the right edge", () => {
    seedSelected();
    const id = useEditor.getState().selectedId as string;
    addBlockEl(id, { top: 150, left: 200, right: 360 });
    const { result } = renderHook(() => useFloatingPanel(), {
      wrapper: makeWrapper(null, noDrag),
    });
    act(() => {
      result.current.handlePointerDown({
        clientX: 374,
        clientY: 150,
        preventDefault: () => {},
      } as React.PointerEvent);
    });
    expect(result.current.dragging).toBe(true);
    act(() => move(500, 300));
    expect(result.current.dragging).toBe(true);
    // release in the dock band (vw - DOCK_THRESHOLD = 1140)
    act(() => up(1190, 300));
    expect(result.current.dragging).toBe(false);
    expect(result.current.docked).toBe(true);
  });

  it("drag-to-move ending outside the dock band leaves it floating", () => {
    seedSelected();
    const id = useEditor.getState().selectedId as string;
    addBlockEl(id, { top: 150, left: 200, right: 360 });
    const { result } = renderHook(() => useFloatingPanel(), {
      wrapper: makeWrapper(null, noDrag),
    });
    act(() => {
      result.current.handlePointerDown({
        clientX: 374,
        clientY: 150,
        preventDefault: () => {},
      } as React.PointerEvent);
    });
    act(() => move(420, 220));
    act(() => up(420, 220));
    expect(result.current.docked).toBe(false);
    expect(result.current.dockHint).toBe(false);
  });

  it("handleResizeDown widens/narrows within the clamp band", () => {
    seedSelected();
    const id = useEditor.getState().selectedId as string;
    addBlockEl(id, { top: 150, left: 200, right: 360 });
    const { result } = renderHook(() => useFloatingPanel(), {
      wrapper: makeWrapper(null, noDrag),
    });
    const stop = vi.fn();
    act(() => {
      result.current.handleResizeDown({
        clientX: 700,
        clientY: 200,
        preventDefault: () => {},
        stopPropagation: stop,
      } as unknown as React.PointerEvent);
    });
    expect(result.current.resizing).toBe(true);
    expect(stop).toHaveBeenCalled();
    // drag the left edge leftward to widen, clamped to <= 560
    act(() => move(100, 200));
    expect(result.current.width).toBe(560);
    act(() => up(100, 200));
    expect(result.current.resizing).toBe(false);
  });

  it("repositions on window scroll", () => {
    seedSelected();
    const id = useEditor.getState().selectedId as string;
    const el = addBlockEl(id, { top: 150, left: 200, right: 360 });
    const { result } = renderHook(() => useFloatingPanel(), {
      wrapper: makeWrapper(null, noDrag),
    });
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    el.getBoundingClientRect = () => rect({ top: 150, left: 400, right: 560 });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.style.left).toBe(560 + 14);
    raf.mockRestore();
  });
});
