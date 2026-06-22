import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { handleActionButtons } from "@/components/editor/CanvasFrame.helpers";
import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";

// `handleActionButtons` only reads `e.target` + `e.preventDefault`, so a thin
// synthetic event over a (possibly detached) element exercises the real
// `closest()`/`getAttribute()` traversal without rendering the whole frame.
function evt(target: unknown) {
  const preventDefault = vi.fn();
  return { e: { target, preventDefault } as unknown as Event, preventDefault };
}

function el(attrs: Record<string, string>) {
  const node = document.createElement("div");
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

beforeEach(() => {
  useEditorUI.setState({ ai: null, inserter: null, ctx: null });
  useEditor.setState({ selectedId: null, selectedIds: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleActionButtons", () => {
  it("opens the AI bar for a [data-open-ai] trigger and consumes the event", () => {
    const { e, preventDefault } = evt(el({ "data-open-ai": "" }));
    const consumed = handleActionButtons(e);
    expect(consumed).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(useEditorUI.getState().ai).toEqual({ parentId: null, index: -1 });
  });

  it("walks up from a nested child to the [data-open-ai] ancestor", () => {
    const button = el({ "data-open-ai": "" });
    const icon = document.createElement("span");
    button.appendChild(icon);
    const { e } = evt(icon);
    expect(handleActionButtons(e)).toBe(true);
    expect(useEditorUI.getState().ai).toEqual({ parentId: null, index: -1 });
  });

  it("opens the inserter at root with a numeric insert-index", () => {
    const { e } = evt(el({ "data-open-inserter": "root", "data-insert-index": "2" }));
    expect(handleActionButtons(e)).toBe(true);
    expect(useEditorUI.getState().inserter).toEqual({ parentId: null, index: 2 });
  });

  it("opens the inserter under a parent id with index -1 when none is given", () => {
    const { e } = evt(el({ "data-open-inserter": "sec-1" }));
    expect(handleActionButtons(e)).toBe(true);
    expect(useEditorUI.getState().inserter).toEqual({ parentId: "sec-1", index: -1 });
  });

  it("treats an empty inserter parent value as root (null parentId)", () => {
    const { e } = evt(el({ "data-open-inserter": "", "data-insert-index": "0" }));
    expect(handleActionButtons(e)).toBe(true);
    expect(useEditorUI.getState().inserter).toEqual({ parentId: null, index: 0 });
  });

  it("quick-adds a block at index 0 under root when parent is 'root'", () => {
    const addBlock = vi.spyOn(useEditor.getState(), "addBlock").mockImplementation(() => {});
    const { e, preventDefault } = evt(el({ "data-add-block": "text", "data-add-parent": "root" }));
    expect(handleActionButtons(e)).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(addBlock).toHaveBeenCalledWith("text", null, 0);
  });

  it("quick-adds a block under an explicit parent id", () => {
    const addBlock = vi.spyOn(useEditor.getState(), "addBlock").mockImplementation(() => {});
    const { e } = evt(el({ "data-add-block": "image", "data-add-parent": "sec-1" }));
    expect(handleActionButtons(e)).toBe(true);
    expect(addBlock).toHaveBeenCalledWith("image", "sec-1", 0);
  });

  it("quick-adds under root when no data-add-parent is present", () => {
    const addBlock = vi.spyOn(useEditor.getState(), "addBlock").mockImplementation(() => {});
    const { e } = evt(el({ "data-add-block": "button" }));
    expect(handleActionButtons(e)).toBe(true);
    expect(addBlock).toHaveBeenCalledWith("button", null, 0);
  });

  it("consumes a [data-add-block] match with a null type without adding a block", () => {
    const addBlock = vi.spyOn(useEditor.getState(), "addBlock").mockImplementation(() => {});
    // A node whose `closest` matches only the add-block selector but whose
    // attribute reads back null exercises the `type == null` guard.
    const target = {
      closest: (sel: string) => (sel === "[data-add-block]" ? { getAttribute: () => null } : null),
    };
    const { e } = evt(target);
    expect(handleActionButtons(e)).toBe(true);
    expect(addBlock).not.toHaveBeenCalled();
  });

  it("returns false for an element with no action attributes", () => {
    const { e, preventDefault } = evt(el({ class: "plain" }));
    expect(handleActionButtons(e)).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(useEditorUI.getState().ai).toBeNull();
    expect(useEditorUI.getState().inserter).toBeNull();
  });

  it("returns false when the event has no target", () => {
    const { e } = evt(null);
    expect(handleActionButtons(e)).toBe(false);
  });
});
