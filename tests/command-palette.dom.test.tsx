import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEditor } from "@/store/editor-store";

// jsdom doesn't implement scrollIntoView; the palette's "scroll active row into
// view" effect touches it. Stub so the effect is exercised without throwing.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

// Strip framer-motion animation props so motion.* render as plain DOM and
// AnimatePresence mounts children synchronously.
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const MOTION_PROPS = new Set(["initial", "animate", "exit", "transition", "layout"]);
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

import { CommandPalette } from "@/components/editor/CommandPalette";

function setup(overrides: Partial<Parameters<typeof CommandPalette>[0]> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onExport: vi.fn(),
    onPublish: vi.fn(),
    ...overrides,
  };
  const utils = render(<CommandPalette {...props} />);
  return { ...utils, props };
}

function input() {
  return screen.getByPlaceholderText("Type a command or search blocks…") as HTMLInputElement;
}

describe("CommandPalette", () => {
  beforeEach(() => {
    push.mockClear();
    useEditor.getState().init({ id: "p1", title: "T", slug: "t", published: false, tree: [] });
  });

  it("renders nothing when closed", () => {
    const { container } = setup({ open: false });
    expect(container.firstChild).toBeNull();
  });

  it("renders the search input and command groups when open", () => {
    setup();
    expect(input()).toBeInTheDocument();
    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.getByText("Desktop view")).toBeInTheDocument();
    expect(screen.getByText("Save page")).toBeInTheDocument();
  });

  it("filters commands as the user types", () => {
    setup();
    fireEvent.change(input(), { target: { value: "publish" } });
    expect(screen.getByText("Publish page")).toBeInTheDocument();
    expect(screen.queryByText("Desktop view")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", () => {
    setup();
    fireEvent.change(input(), { target: { value: "zzzzzzz" } });
    expect(screen.getByText("No matching commands.")).toBeInTheDocument();
  });

  it("runs a command and closes on click", () => {
    const onSave = vi.fn();
    const { props } = setup({ onSave });
    fireEvent.click(screen.getByText("Save page"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("Enter runs the active command (first result) and closes", () => {
    const onSave = vi.fn();
    const { props } = setup({ onSave });
    fireEvent.change(input(), { target: { value: "save" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("ArrowDown moves the active row; Enter then runs it", () => {
    const onSave = vi.fn();
    const onPublish = vi.fn();
    setup({ onSave, onPublish });
    // narrow to Page group so order is deterministic: Save, Publish, Export, Home
    fireEvent.change(input(), { target: { value: "page" } });
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onPublish).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("ArrowUp does not move below index 0", () => {
    const onSave = vi.fn();
    setup({ onSave });
    fireEvent.change(input(), { target: { value: "page" } });
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("Escape closes the palette", () => {
    const { props } = setup();
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("mouse-move sets the active row used by Enter", () => {
    const onPublish = vi.fn();
    const onSave = vi.fn();
    setup({ onPublish, onSave });
    fireEvent.change(input(), { target: { value: "page" } });
    fireEvent.mouseMove(screen.getByText("Publish page"));
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onPublish).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("clicking the backdrop closes; clicking the panel does not", () => {
    const { props, container } = setup();
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement;
    const panel = container.querySelector(".max-w-xl") as HTMLElement;
    fireEvent.click(panel);
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.click(backdrop);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("an insert-block command appends a block to the editor tree", () => {
    const { props } = setup();
    expect(useEditor.getState().tree.length).toBe(0);
    fireEvent.change(input(), { target: { value: "Add Heading" } });
    fireEvent.click(screen.getByText("Add Heading"));
    const tree = useEditor.getState().tree;
    expect(tree.length).toBe(1);
    expect(tree[0].type).toBe("heading");
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("resets the query when reopened", () => {
    const { rerender, props } = setup();
    fireEvent.change(input(), { target: { value: "publish" } });
    expect(input().value).toBe("publish");
    rerender(<CommandPalette {...props} open={false} />);
    rerender(<CommandPalette {...props} open={true} />);
    expect(input().value).toBe("");
  });
});
