import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { Block } from "@/lib/types";
import { useEditor } from "@/store/editor-store";
import { SlottedChildren } from "@/components/editor/EditorBlock";
import { DragProvider, type DragInfo } from "@/components/editor/drag-context";
import { ComponentsProvider } from "@/components/editor/components-context";
import type { ComponentItem } from "@/components/editor/components-context";

function block(partial: Partial<Block> & { id: string; type: string }): Block {
  return { props: {}, styles: {}, children: [], ...partial };
}

const idleDrag: DragInfo = { type: null, id: null, invalid: new Set(), ghost: null };

function renderTree(
  items: Block[],
  opts: {
    drag?: DragInfo;
    components?: { list: ComponentItem[]; map: Record<string, ComponentItem> };
  } = {},
) {
  const drag = opts.drag ?? idleDrag;
  const components = opts.components ?? { list: [], map: {} };
  return render(
    <ComponentsProvider value={{ ...components, refresh: async () => {} }}>
      <DragProvider value={drag}>
        <SlottedChildren parentId={null} parentType="root" items={items} />
      </DragProvider>
    </ComponentsProvider>,
  );
}

function initTree(tree: Block[]) {
  useEditor.getState().init({ id: "p", title: "T", slug: "t", published: false, tree });
}

beforeEach(() => {
  initTree([]);
  // jsdom lacks scrollIntoView; the "new block" effect calls it.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SlottedChildren / EditorBlock", () => {
  it("renders the empty root placeholder when there are no items", () => {
    const { container } = renderTree([]);
    // EmptyDrop (idle, root) renders the rich "Start building" placeholder.
    expect(screen.getByText(/Start building your page/i)).toBeInTheDocument();
    expect(container.querySelector("[data-block-id]")).toBeNull();
  });

  it("renders a non-container block with its hook class and data attributes", () => {
    const heading = block({ id: "h1", type: "heading", props: { htmlId: "my-heading" } });
    initTree([heading]);
    const { container } = renderTree([heading]);
    const node = container.querySelector('[data-block-id="h1"]');
    expect(node).not.toBeNull();
    expect(node?.getAttribute("data-block-type")).toBe("heading");
    expect(node?.getAttribute("data-is-component")).toBeNull();
    // The render component receives the b-<id> hook class + author html id.
    expect(container.querySelector(".b-h1")).not.toBeNull();
    expect(container.querySelector("#my-heading")).not.toBeNull();
  });

  it("renders a slotted container (section) and nests its children", () => {
    const child = block({ id: "c1", type: "heading" });
    const section = block({ id: "sec", type: "section", children: [child] });
    initTree([section]);
    const { container } = renderTree([section]);
    expect(container.querySelector('[data-block-id="sec"]')).not.toBeNull();
    // Nested child block is rendered inside the container.
    expect(container.querySelector('[data-block-id="c1"]')).not.toBeNull();
  });

  it("renders a fixed-strategy container (columns) mapping its children directly", () => {
    const cols = block({
      id: "cols",
      type: "columns",
      props: { layout: "1-1" },
      children: [block({ id: "col1", type: "column" }), block({ id: "col2", type: "column" })],
    });
    initTree([cols]);
    const { container } = renderTree([cols]);
    expect(container.querySelector('[data-block-id="cols"]')).not.toBeNull();
    expect(container.querySelector('[data-block-id="col1"]')).not.toBeNull();
    expect(container.querySelector('[data-block-id="col2"]')).not.toBeNull();
  });

  it("renders a component instance preview when the source component exists", () => {
    const comp: ComponentItem = {
      id: "cmp1",
      name: "Header",
      content: [block({ id: "inner", type: "heading" })],
    };
    const instance = block({ id: "inst", type: "component", props: { componentId: "cmp1" } });
    initTree([instance]);
    const { container } = renderTree([instance], {
      components: { list: [comp], map: { cmp1: comp } },
    });
    const node = container.querySelector('[data-block-id="inst"]');
    expect(node).not.toBeNull();
    expect(node?.getAttribute("data-is-component")).toBe("1");
    // The preview is wrapped in a pointer-events-none shell.
    expect(container.querySelector(".pointer-events-none")).not.toBeNull();
  });

  it('shows the "Component not found" placeholder for a missing source', () => {
    const instance = block({ id: "inst2", type: "component", props: { componentId: "missing" } });
    initTree([instance]);
    renderTree([instance], { components: { list: [], map: {} } });
    expect(screen.getByText(/Component not found/i)).toBeInTheDocument();
  });

  it("renders nothing for a non-component block with an unknown type", () => {
    const unknown = block({ id: "ghost", type: "no-such-block" });
    initTree([unknown]);
    const { container } = renderTree([unknown]);
    expect(container.querySelector('[data-block-id="ghost"]')).toBeNull();
  });

  it("scrolls a freshly-added block into view and clears the marker", () => {
    const heading = block({ id: "fresh", type: "heading" });
    const rafSpy = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });
    useEditor.setState({ tree: [heading], lastAddedId: "fresh" });
    act(() => {
      renderTree([heading]);
    });
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(useEditor.getState().lastAddedId).toBeNull();
    rafSpy.mockRestore();
  });

  it("does not scroll blocks that are not the freshly-added one", () => {
    const heading = block({ id: "old", type: "heading" });
    useEditor.setState({ tree: [heading], lastAddedId: "someone-else" });
    renderTree([heading]);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
