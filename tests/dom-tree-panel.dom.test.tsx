// Renders the exported DomTreePanel so its internal helpers/sub-components run:
//  • domNodeText      — text || title || brand || (none)
//  • DomNodeRow       — id / class / unknown-def "?" / text branches + selection
//  • nextFloatSize    — width / height / corner resize math (float mode)
// The two zustand stores are mocked (selector-style) so we control the tree and
// the open flag; the iframe context falls back to its default (frame: null), so
// the panel's passthrough() no-ops. framer-motion renders inline in jsdom.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { Block } from "@/lib/types";

const h = vi.hoisted(() => ({
  state: {
    tree: [] as Block[],
    selectedId: null as string | null,
    hoveredId: null as string | null,
    select: vi.fn(),
    hover: vi.fn(),
  },
  ui: {
    domTree: true,
    closeDomTree: vi.fn(),
  },
}));

vi.mock("@/store/editor-store", () => ({
  useEditor: (selector: (s: typeof h.state) => unknown) => selector(h.state),
}));
vi.mock("@/store/editor-ui", () => ({
  useEditorUI: (selector: (s: typeof h.ui) => unknown) => selector(h.ui),
}));

import { DomTreePanel } from "@/components/editor/DomTreePanel";

function blk(p: Partial<Block> & { id: string; type: string }): Block {
  return { props: {}, styles: {}, children: [], ...p };
}

function must<T>(v: T | null | undefined): T {
  if (v == null) throw new Error("expected a value");
  return v;
}

// Dispatch a native pointer-typed MouseEvent (jsdom has no PointerEvent ctor, but
// React reads clientX/clientY off the native event and the panel's own window
// listeners only read those too).
function firePointer(
  target: EventTarget,
  type: "pointerdown" | "pointermove" | "pointerup",
  init: { clientX?: number; clientY?: number } = {},
) {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
  });
}

beforeEach(() => {
  h.state.tree = [];
  h.state.selectedId = null;
  h.state.hoveredId = null;
  h.state.select.mockReset();
  h.state.hover.mockReset();
  h.ui.domTree = true;
  h.ui.closeDomTree.mockReset();
});

describe("DomTreePanel — DOM rows (domNodeText + DomNodeRow)", () => {
  beforeEach(() => {
    // A: selected, has id + (de-duped) class, has def, text via `title`, has a child.
    // a1: child (depth 1), text via `text`.
    // B: hovered, no id/class, def, text via `text`.
    // C: unselected, unknown type (no def → "?"), text via `brand`.
    // D: unselected, no text/title/brand → domNodeText undefined (no text span).
    h.state.tree = [
      blk({
        id: "a",
        type: "hero",
        props: { title: "Hero Heading Title", htmlId: "main hero", htmlClass: "foo foo bar" },
        children: [blk({ id: "a1", type: "text", props: { text: "Child text here" } })],
      }),
      blk({ id: "b", type: "text", props: { text: "Body text content" } }),
      blk({ id: "c", type: "totallyUnknownType", props: { brand: "Acme Brand" } }),
      blk({ id: "d", type: "divider", props: {} }),
    ];
    h.state.selectedId = "a";
    h.state.hoveredId = "b";
  });

  it("renders every node with the right tag/id/class/text branches", () => {
    render(<DomTreePanel />);

    // header element count = countNodes (A + a1 + B + C + D = 5)
    expect(screen.getByText("5 elements")).toBeInTheDocument();

    // tags (tagFor): hero→section, text→div, divider→div, unknown→div
    expect(screen.getByText("section")).toBeInTheDocument();

    // domNodeText branches
    expect(screen.getByText("Hero Heading Title")).toBeInTheDocument(); // title
    expect(screen.getByText("Child text here")).toBeInTheDocument(); // text (child)
    expect(screen.getByText("Body text content")).toBeInTheDocument(); // text
    expect(screen.getByText("Acme Brand")).toBeInTheDocument(); // brand

    // DomNodeRow: id (spaces collapsed to dashes) + de-duped class list
    expect(screen.getByText('"main-hero"')).toBeInTheDocument();
    expect(screen.getByText('"foo bar"')).toBeInTheDocument();

    // DomNodeRow: unknown block type with no registry def renders the "?" marker
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("selected vs hovered vs plain rows get the right background classes", () => {
    render(<DomTreePanel />);

    const rowOf = (txt: string) => must(screen.getByText(txt).closest("div"));
    expect(rowOf("Hero Heading Title").className).toContain("bg-indigo-100"); // selected
    expect(rowOf("Body text content").className).toContain("bg-zinc-100"); // hovered
    expect(rowOf("Acme Brand").className).toContain("hover:bg-zinc-100"); // plain
  });

  it("clicking / hovering a row fires the store select + hover handlers", () => {
    render(<DomTreePanel />);
    const row = must(screen.getByText("Acme Brand").closest("div"));

    fireEvent.click(row);
    expect(h.state.select).toHaveBeenCalledWith("c");

    fireEvent.mouseEnter(row);
    expect(h.state.hover).toHaveBeenCalledWith("c");

    fireEvent.mouseLeave(row);
    expect(h.state.hover).toHaveBeenCalledWith(null);
  });

  it("renders the empty-state copy when the tree has no blocks", () => {
    h.state.tree = [];
    render(<DomTreePanel />);
    expect(screen.getByText(/No elements yet/)).toBeInTheDocument();
    expect(screen.getByText("0 elements")).toBeInTheDocument();
  });

  it("the close button calls closeDomTree", () => {
    render(<DomTreePanel />);
    fireEvent.click(screen.getByTitle("Hide DOM tree"));
    expect(h.ui.closeDomTree).toHaveBeenCalledTimes(1);
  });
});

describe("DomTreePanel — float resize (nextFloatSize)", () => {
  beforeEach(() => {
    h.state.tree = [blk({ id: "a", type: "section", props: {} })];
  });

  function floatAside(): HTMLElement {
    return must(document.querySelector("aside.rounded-xl")) as HTMLElement;
  }

  it("detaches to float mode, then resizes width / height / corner", () => {
    render(<DomTreePanel />);

    // detach: clicking the float mode button switches to the floating panel,
    // which mounts the right/bottom/corner resize handles.
    fireEvent.click(screen.getByTitle("Detach / float"));
    const aside = floatAside();
    expect(aside).toBeInTheDocument();
    expect(aside.style.width).toBe("520px"); // ensureFloat: min(520, innerWidth-360)

    // width handle (dims "w"): only the width changes
    const wHandle = must(aside.querySelector(".cursor-ew-resize"));
    firePointer(wHandle, "pointerdown", { clientX: 100, clientY: 100 });
    firePointer(window, "pointermove", { clientX: 240, clientY: 140 });
    firePointer(window, "pointerup", { clientX: 240, clientY: 140 });
    expect(floatAside().style.width).toBe("536px"); // clamped to innerWidth - x - 8

    // height handle (dims "h"): only the height changes
    const hHandle = must(floatAside().querySelector(".cursor-ns-resize"));
    firePointer(hHandle, "pointerdown", { clientX: 100, clientY: 100 });
    firePointer(window, "pointermove", { clientX: 130, clientY: 260 });
    firePointer(window, "pointerup", { clientX: 130, clientY: 260 });
    expect(floatAside().style.height).toBe("580px");

    // corner handle (dims "wh"): both width + height paths run
    const whHandle = must(floatAside().querySelector(".cursor-nwse-resize"));
    firePointer(whHandle, "pointerdown", { clientX: 100, clientY: 100 });
    firePointer(window, "pointermove", { clientX: 60, clientY: 360 });
    firePointer(window, "pointerup", { clientX: 60, clientY: 360 });

    const final = floatAside();
    expect(final).toBeInTheDocument();
    // height grew again via the corner (h branch of nextFloatSize)
    expect(final.style.height).toBe("680px");
  });

  it("dock and full-width mode buttons stay docked (no float handles)", () => {
    render(<DomTreePanel />);
    fireEvent.click(screen.getByTitle("Full width"));
    fireEvent.click(screen.getByTitle("Dock to canvas"));
    expect(document.querySelector("aside.rounded-xl")).toBeNull();
  });
});
