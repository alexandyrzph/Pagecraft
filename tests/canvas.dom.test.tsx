import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEffect } from "react";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import type { Block } from "@/lib/types";

// Mock the heavy renderers so CanvasContent renders without the real
// BlockRenderer / editor-block subtree (stores, dnd-kit, …).
vi.mock("@/components/BlockRenderer", () => ({
  BlockRenderer: ({ tree }: { tree: Block[] }) => (
    <div data-testid="block-renderer" data-count={tree.length} />
  ),
}));
vi.mock("@/components/editor/EditorBlock", () => ({
  SlottedChildren: ({ items }: { items: Block[] }) => (
    <div data-testid="slotted-children" data-count={items.length} />
  ),
}));

// Lightweight stand-ins for the device chrome so we can assert the props the
// Canvas passes them (fullBleed, editable, resizer side/width/resizing).
vi.mock("@/components/editor/DeviceFrame", () => ({
  DeviceFrame: ({
    children,
    fullBleed,
    slug,
    viewport,
  }: {
    children: React.ReactNode;
    fullBleed?: boolean;
    slug: string;
    viewport: string;
  }) => (
    <div
      data-testid="device-frame"
      data-full-bleed={String(!!fullBleed)}
      data-slug={slug}
      data-viewport={viewport}
    >
      {children}
    </div>
  ),
}));
vi.mock("@/components/editor/CanvasFrame", () => ({
  CanvasFrame: ({
    children,
    editable,
    cssExtra,
  }: {
    children: React.ReactNode;
    editable: boolean;
    cssExtra?: Block[];
  }) => (
    <div
      data-testid="canvas-frame"
      data-editable={String(editable)}
      data-css-extra={cssExtra == null ? "none" : String(cssExtra.length)}
    >
      {children}
    </div>
  ),
}));
vi.mock("@/components/editor/DeviceResizer", () => ({
  DeviceResizer: ({
    side,
    width,
    resizing,
    onPointerDown,
  }: {
    side: "left" | "right";
    width: number;
    resizing: boolean;
    onPointerDown: (e: unknown) => void;
  }) => (
    <button
      data-testid={`resizer-${side}`}
      data-width={String(width)}
      data-resizing={String(resizing)}
      onPointerDown={onPointerDown}
    />
  ),
}));

import { Canvas } from "@/components/editor/Canvas";
import { ComponentsProvider } from "@/components/editor/components-context";
import { CollectionsProvider } from "@/components/editor/collections-context";
import { SiteProvider } from "@/components/editor/site-context";
import { IframeProvider } from "@/components/editor/iframe-context";
import { useEditor } from "@/store/editor-store";
import { useCanvasZoom } from "@/store/canvas-zoom";
import { useBreakpoints } from "@/store/breakpoints";

function block(id: string): Block {
  return { id, type: "Section", props: {}, styles: {}, children: [] } as unknown as Block;
}

function initPage(tree: Block[]) {
  useEditor.getState().init({
    id: "page-1",
    title: "T",
    slug: "home",
    published: false,
    tree,
  });
}

const cap: { setActive: (id: string) => void } = { setActive: () => {} };
function CaptureBreakpoints() {
  const setActive = useBreakpoints().setActive;
  useEffect(() => {
    cap.setActive = setActive;
  }, [setActive]);
  return null;
}

function renderCanvas(opts?: { header?: Block[]; footer?: Block[] }) {
  const header = opts?.header ?? [];
  const footer = opts?.footer ?? [];
  return render(
    <ComponentsProvider value={{ list: [], map: {}, refresh: async () => {} }}>
      <CollectionsProvider value={{ list: [], map: {}, refresh: async () => {} }}>
        <SiteProvider value={{ header, footer, refresh: async () => {} }}>
          <IframeProvider value={{ frame: null, tick: 0, register: () => {}, bump: () => {} }}>
            <CaptureBreakpoints />
            <Canvas />
          </IframeProvider>
        </SiteProvider>
      </CollectionsProvider>
    </ComponentsProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useEditor.setState({ previewMode: false });
  useCanvasZoom.setState({ zoom: 1, viewportWidth: 0 });
  initPage([]);
});

afterEach(() => {
  // The breakpoints store is a module singleton; reset it to desktop so the
  // active breakpoint doesn't leak between tests.
  act(() => {
    cap.setActive("desktop");
  });
  cleanup();
});

describe("Canvas", () => {
  it("desktop fill: no resize handles, full-bleed device, zero padding", () => {
    initPage([block("a")]);
    const { container } = renderCanvas();

    // Default breakpoint is desktop with no drag width → desktopFill.
    expect(screen.queryByTestId("resizer-left")).toBeNull();
    expect(screen.queryByTestId("resizer-right")).toBeNull();
    expect(screen.getByTestId("device-frame").getAttribute("data-full-bleed")).toBe("true");
    expect(screen.getByTestId("device-frame").getAttribute("data-viewport")).toBe("desktop");
    expect(screen.getByTestId("device-frame").getAttribute("data-slug")).toBe("home");

    const scroll = container.firstChild as HTMLElement;
    expect(scroll.className).toContain("p-0");

    // Edit mode → CanvasFrame editable; no preview cssExtra.
    const frame = screen.getByTestId("canvas-frame");
    expect(frame.getAttribute("data-editable")).toBe("true");
    expect(frame.getAttribute("data-css-extra")).toBe("none");

    // Non-empty edit tree → SlottedChildren + an "Add section" button.
    expect(screen.getByTestId("slotted-children").getAttribute("data-count")).toBe("1");
    expect(screen.getByText("Add section")).toBeInTheDocument();
  });

  it("clicking the scroll area deselects, clicking the device does not", () => {
    initPage([block("a")]);
    useEditor.setState({ selectedId: "a", selectedIds: ["a"] });
    const { container } = renderCanvas();

    const device = screen.getByTestId("device-frame").parentElement as HTMLElement;
    fireEvent.click(device);
    // stopPropagation on the device box: selection survives.
    expect(useEditor.getState().selectedId).toBe("a");

    fireEvent.click(container.firstChild as HTMLElement);
    expect(useEditor.getState().selectedId).toBeNull();
  });

  it("non-desktop breakpoint renders both resize handles with the active width", () => {
    renderCanvas();

    // Switch to the tablet preset via the store hook's action.
    act(() => {
      cap.setActive("tablet");
    });

    const left = screen.getByTestId("resizer-left");
    const right = screen.getByTestId("resizer-right");
    expect(left.getAttribute("data-width")).toBe("820");
    expect(right.getAttribute("data-width")).toBe("820");
    expect(left.getAttribute("data-resizing")).toBe("false");
    expect(screen.getByTestId("device-frame").getAttribute("data-full-bleed")).toBe("false");
  });

  it("preview mode hides the resizers and feeds CanvasFrame the header/footer cssExtra", () => {
    initPage([block("a")]);
    useEditor.setState({ previewMode: true });
    renderCanvas({ header: [block("h")], footer: [block("f1"), block("f2")] });

    expect(screen.queryByTestId("resizer-left")).toBeNull();
    expect(screen.getByTestId("canvas-frame").getAttribute("data-editable")).toBe("false");
    // header(1) + footer(2) flattened into cssExtra.
    expect(screen.getByTestId("canvas-frame").getAttribute("data-css-extra")).toBe("3");
    // Preview branch renders BlockRenderers (header, tree, footer), not SlottedChildren.
    expect(screen.getAllByTestId("block-renderer").length).toBe(3);
    expect(screen.queryByTestId("slotted-children")).toBeNull();
  });
});
