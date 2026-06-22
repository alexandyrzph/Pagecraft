import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// next/navigation has no app-router provider in the test tree.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// useDraggable needs a DndContext + DOM measurement; stub it deterministically.
vi.mock("@dnd-kit/core", async (orig) => {
  const actual = await orig<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      setActivatorNodeRef: () => {},
      isDragging: false,
      node: { current: null },
      transform: null,
    }),
  };
});

import { CanvasOverlay } from "@/components/editor/CanvasOverlay";
import { IframeProvider, type FrameInfo } from "@/components/editor/iframe-context";
import { ComponentsProvider, type ComponentItem } from "@/components/editor/components-context";
import { EditorActionsProvider } from "@/components/editor/editor-actions";
import { DragProvider, type DragInfo } from "@/components/editor/drag-context";
import { useEditor } from "@/store/editor-store";
import type { Block } from "@/lib/types";

function block(id: string, type: string, props: Record<string, unknown> = {}): Block {
  return { id, type, props, styles: {}, children: [] };
}

const created: HTMLElement[] = [];

function makeFrame(): FrameInfo {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  Object.defineProperty(iframe, "clientHeight", { value: 800, configurable: true });
  created.push(iframe);
  return { el: iframe, doc: document, body: document.body };
}

// Append a fake block element the overlay measures. With `inView` it reports an
// on-screen rect; otherwise jsdom's default (all-zero) rect reads as scrolled out.
function addBlockEl(id: string, inView: boolean) {
  const el = document.createElement("div");
  el.setAttribute("data-block-id", id);
  if (inView) {
    el.getBoundingClientRect = () =>
      ({
        top: 100,
        left: 50,
        width: 200,
        height: 40,
        bottom: 140,
        right: 250,
        x: 50,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect;
  }
  document.body.appendChild(el);
  created.push(el);
  return el;
}

function renderOverlay(opts: {
  frame: FrameInfo;
  components?: { list: ComponentItem[]; map: Record<string, ComponentItem> };
  drag?: DragInfo;
  saveAsComponent?: (b: Block) => void;
}) {
  const components = opts.components ?? { list: [], map: {} };
  const drag: DragInfo = opts.drag ?? { type: null, id: null, invalid: new Set(), ghost: null };
  return render(
    <IframeProvider value={{ frame: opts.frame, tick: 0, register: () => {}, bump: () => {} }}>
      <ComponentsProvider value={{ ...components, refresh: async () => {} }}>
        <DragProvider value={drag}>
          <EditorActionsProvider
            value={{
              switchPage: () => {},
              confirmLeave: (a) => a(),
              loadPageInPlace: async () => {},
              saveAsComponent: opts.saveAsComponent ?? (() => {}),
            }}
          >
            <CanvasOverlay />
          </EditorActionsProvider>
        </DragProvider>
      </ComponentsProvider>
    </IframeProvider>,
  );
}

beforeEach(() => {
  // The overlay drives a rAF position loop; keep it a no-op so it never recurses.
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  useEditor.getState().init({ id: "p", title: "T", slug: "t", published: false, tree: [] });
});

afterEach(() => {
  created.splice(0).forEach((el) => el.remove());
  vi.unstubAllGlobals();
});

describe("CanvasOverlay / BlockChrome", () => {
  it("renders the outline + toolbar for a selected non-component block", () => {
    useEditor.getState().init({
      id: "p",
      title: "T",
      slug: "t",
      published: false,
      tree: [block("b1", "heading")],
    });
    useEditor.getState().select("b1");
    const frame = makeFrame();
    addBlockEl("b1", true);

    const { container } = renderOverlay({ frame });

    expect(screen.getByText("Heading")).toBeInTheDocument();
    expect(screen.getByTitle("Save as component")).toBeInTheDocument();
    expect(screen.getByTitle("Duplicate")).toBeInTheDocument();
    expect(screen.getByTitle("Delete")).toBeInTheDocument();
    expect(container.querySelector('[class*="outline"]')).not.toBeNull();
  });

  it("fires the non-component toolbar actions (save-as-component + duplicate)", () => {
    useEditor.getState().init({
      id: "p",
      title: "T",
      slug: "t",
      published: false,
      tree: [block("b1", "heading")],
    });
    useEditor.getState().select("b1");
    const frame = makeFrame();
    addBlockEl("b1", true);
    const saveAsComponent = vi.fn();

    renderOverlay({ frame, saveAsComponent });

    fireEvent.click(screen.getByTitle("Save as component"));
    expect(saveAsComponent).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle("Duplicate"));
    expect(useEditor.getState().tree.length).toBe(2);
  });

  it("deletes the block from the toolbar", () => {
    useEditor.getState().init({
      id: "p",
      title: "T",
      slug: "t",
      published: false,
      tree: [block("b1", "heading")],
    });
    useEditor.getState().select("b1");
    const frame = makeFrame();
    addBlockEl("b1", true);

    renderOverlay({ frame });

    fireEvent.click(screen.getByTitle("Delete"));
    expect(useEditor.getState().tree.length).toBe(0);
  });

  it("uses the component name + edit/detach actions for a component instance", () => {
    useEditor.getState().init({
      id: "p",
      title: "T",
      slug: "t",
      published: false,
      tree: [block("c1", "component", { componentId: "cmp1" })],
    });
    useEditor.getState().select("c1");
    const frame = makeFrame();
    addBlockEl("c1", true);
    const comp: ComponentItem = { id: "cmp1", name: "Hero Card", content: [] };

    renderOverlay({ frame, components: { list: [comp], map: { cmp1: comp } } });

    expect(screen.getByText("Hero Card")).toBeInTheDocument();
    const edit = screen.getByTitle("Edit component");
    const detach = screen.getByTitle("Detach");
    expect(edit).toBeInTheDocument();
    expect(detach).toBeInTheDocument();
    expect(screen.queryByTitle("Save as component")).toBeNull();

    // Exercise the component-specific handlers (router push + detach).
    fireEvent.click(edit);
    fireEvent.click(detach);
    expect(useEditor.getState().tree.length).toBe(0);
  });

  it("renders nothing for the block while a drag is active", () => {
    useEditor.getState().init({
      id: "p",
      title: "T",
      slug: "t",
      published: false,
      tree: [block("b1", "heading")],
    });
    useEditor.getState().select("b1");
    const frame = makeFrame();
    addBlockEl("b1", true);

    renderOverlay({
      frame,
      drag: { type: "move", id: "b1", invalid: new Set(), ghost: null },
    });

    expect(screen.queryByText("Heading")).toBeNull();
    expect(screen.queryByTitle("Duplicate")).toBeNull();
  });

  it("renders nothing when the block is scrolled out of the iframe viewport", () => {
    useEditor.getState().init({
      id: "p",
      title: "T",
      slug: "t",
      published: false,
      tree: [block("b1", "heading")],
    });
    useEditor.getState().select("b1");
    const frame = makeFrame();
    addBlockEl("b1", false); // zero rect -> out of view -> null chrome rect

    renderOverlay({ frame });

    expect(screen.queryByTitle("Duplicate")).toBeNull();
  });

  it("renders nothing when the selected id has no matching block", () => {
    useEditor.getState().init({
      id: "p",
      title: "T",
      slug: "t",
      published: false,
      tree: [block("b1", "heading")],
    });
    useEditor.getState().select("ghost");
    const frame = makeFrame();

    renderOverlay({ frame });

    expect(screen.queryByTitle("Duplicate")).toBeNull();
  });

  it("draws outlines without toolbars for a multi-selection", () => {
    useEditor.getState().init({
      id: "p",
      title: "T",
      slug: "t",
      published: false,
      tree: [block("b1", "heading"), block("b2", "text")],
    });
    useEditor.setState({ selectedId: "b1", selectedIds: ["b1", "b2"] });
    const frame = makeFrame();
    addBlockEl("b1", true);
    addBlockEl("b2", true);

    const { container } = renderOverlay({ frame });

    // hideToolbar is true for both the primary (multi) and the secondary chrome.
    expect(screen.queryByTitle("Duplicate")).toBeNull();
    expect(container.querySelectorAll('[class*="outline"]').length).toBeGreaterThanOrEqual(2);
  });

  it("renders a separate hover chrome (selected=false) alongside the selection", () => {
    useEditor.getState().init({
      id: "p",
      title: "T",
      slug: "t",
      published: false,
      tree: [block("b1", "heading"), block("b2", "text")],
    });
    useEditor.getState().select("b1");
    useEditor.getState().hover("b2");
    const frame = makeFrame();
    addBlockEl("b1", true);
    addBlockEl("b2", true);

    renderOverlay({ frame });

    expect(screen.getByText("Heading")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
    // Both the hovered and the selected block get their own toolbar.
    expect(screen.getAllByTitle("Duplicate").length).toBe(2);
  });
});
