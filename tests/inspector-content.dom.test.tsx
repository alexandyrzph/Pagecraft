import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Strip framer-motion animation props so motion.* render as plain DOM and
// AnimatePresence mounts children synchronously.
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const MOTION_PROPS = new Set([
    "initial",
    "animate",
    "exit",
    "transition",
    "layout",
    "whileTap",
    "whileHover",
  ]);
  const passthrough = (Tag: string) =>
    function MotionStub(props: Record<string, unknown>) {
      const rest: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (k !== "children" && !MOTION_PROPS.has(k)) rest[k] = v;
      }
      return React.createElement(Tag, rest, props.children as React.ReactNode);
    };
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }) as Record<
      string,
      unknown
    >,
  };
});

import { InspectorContent } from "@/components/editor/inspector/InspectorContent";
import { EditorActionsProvider } from "@/components/editor/editor-actions";
import { useEditor } from "@/store/editor-store";
import { useBreakpoints } from "@/store/breakpoints";
import type { Block } from "@/lib/types";

function block(
  id: string,
  type: string,
  props: Record<string, unknown> = {},
  children: Block[] = [],
): Block {
  return { id, type, props, styles: {}, children };
}

function initTree(tree: Block[]) {
  useEditor.getState().init({ id: "p", title: "T", slug: "t", published: false, tree });
}

const noopActions = {
  switchPage: () => {},
  confirmLeave: (a: () => void) => a(),
  loadPageInPlace: async () => {},
  saveAsComponent: vi.fn(),
};

function renderInspector(
  b: Block,
  overrides: Partial<{
    dragging: boolean;
    docked: boolean;
    onToggleDock: () => void;
    onHandlePointerDown: (e: React.PointerEvent) => void;
    actions: typeof noopActions;
  }> = {},
) {
  const actions = overrides.actions ?? noopActions;
  return render(
    <EditorActionsProvider value={actions}>
      <InspectorContent
        block={b}
        dragging={overrides.dragging}
        docked={overrides.docked}
        onToggleDock={overrides.onToggleDock}
        onHandlePointerDown={overrides.onHandlePointerDown}
      />
    </EditorActionsProvider>,
  );
}

function ActiveBaseProbe() {
  const { active } = useBreakpoints();
  return <span data-testid="active-base">{active.base}</span>;
}

beforeEach(() => {
  localStorage.clear();
  noopActions.saveAsComponent.mockReset();
  useEditor.setState({ viewport: "desktop" });
  initTree([]);
});

describe("InspectorContent", () => {
  it("returns null for an unknown block type", () => {
    const { container } = renderInspector(block("x", "totally-unknown-type"));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the header label/icon and content fields for a block with fields", () => {
    initTree([block("h1", "heading", { text: "Hello", level: "h2" })]);
    renderInspector(block("h1", "heading", { text: "Hello", level: "h2" }));

    expect(screen.getByText("Heading")).toBeInTheDocument();
    // The heading block has a "Text" content field.
    expect(screen.getByText("Text")).toBeInTheDocument();
    // Attributes control is always present on the content tab.
    expect(screen.getByText("Attributes")).toBeInTheDocument();
  });

  it("shows the empty-content hint for a block with no fields", () => {
    initTree([block("t1", "text", { text: "hi" })]);
    renderInspector(block("t1", "text", { text: "hi" }));

    expect(screen.getByText(/This block has no content options/)).toBeInTheDocument();
    expect(screen.getByText("Attributes")).toBeInTheDocument();
  });

  it("hides the 'Save as component' action for a component block", () => {
    initTree([block("c1", "component", { componentId: "x" })]);
    renderInspector(block("c1", "component", { componentId: "x" }));

    expect(screen.queryByTitle("Save as component")).toBeNull();
  });

  it("fires saveAsComponent / duplicate / delete / close header actions", () => {
    initTree([block("h1", "heading", { text: "Hi" }), block("h2", "heading", { text: "Yo" })]);
    const b = block("h1", "heading", { text: "Hi" });
    renderInspector(b);

    fireEvent.click(screen.getByTitle("Save as component"));
    expect(noopActions.saveAsComponent).toHaveBeenCalledWith(b);

    fireEvent.click(screen.getByTitle("Duplicate"));
    expect(useEditor.getState().tree.length).toBe(3);

    fireEvent.click(screen.getByTitle("Delete"));
    expect(useEditor.getState().tree.some((n) => n.id === "h1")).toBe(false);

    useEditor.getState().select("h2");
    expect(useEditor.getState().selectedId).toBe("h2");
    fireEvent.click(screen.getByTitle("Close"));
    expect(useEditor.getState().selectedId).toBeNull();
  });

  it("shows the dock-vs-float title and fires onToggleDock", () => {
    initTree([block("h1", "heading")]);
    const onToggleDock = vi.fn();

    const { rerender } = renderInspector(block("h1", "heading"), {
      docked: false,
      onToggleDock,
    });
    expect(screen.getByTitle("Dock to right")).toBeInTheDocument();

    rerender(
      <EditorActionsProvider value={noopActions}>
        <InspectorContent block={block("h1", "heading")} docked onToggleDock={onToggleDock} />
      </EditorActionsProvider>,
    );
    fireEvent.click(screen.getByTitle("Float panel"));
    expect(onToggleDock).toHaveBeenCalled();
  });

  it("switches to the Style tab and renders the viewport picker", () => {
    initTree([block("h1", "heading")]);
    useEditor.getState().select("h1");
    renderInspector(block("h1", "heading"));

    // Content-only controls are visible first.
    expect(screen.getByText("Attributes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "style" }));

    expect(screen.getByText("Editing viewport")).toBeInTheDocument();
    // Visibility control lives on the style tab.
    expect(screen.getByText("Visibility")).toBeInTheDocument();
  });

  it("selects a non-desktop viewport via setActive", () => {
    initTree([block("h1", "heading")]);
    useEditor.getState().select("h1");
    render(
      <EditorActionsProvider value={noopActions}>
        <ActiveBaseProbe />
        <InspectorContent block={block("h1", "heading")} />
      </EditorActionsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "style" }));
    expect(screen.getByTestId("active-base").textContent).toBe("desktop");

    // The picker exposes a tablet button whose accessible name is exactly
    // "tablet" (the visibility toggles instead read "Hide on tablet").
    fireEvent.click(screen.getByRole("button", { name: "tablet" }));
    expect(screen.getByTestId("active-base").textContent).toBe("tablet");
  });

  it("shows the override hint when the editor viewport is non-desktop", () => {
    initTree([block("h1", "heading")]);
    useEditor.getState().select("h1");
    useEditor.setState({ viewport: "tablet" });
    renderInspector(block("h1", "heading"));

    fireEvent.click(screen.getByRole("button", { name: "style" }));
    expect(screen.getByText(/Overrides the desktop value on tablet and below/)).toBeInTheDocument();
  });
});
