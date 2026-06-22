import { describe, it, expect } from "vitest";
import { deriveContextMenuView, MENU_W } from "@/components/editor/ContextMenu.helpers";
import type { Block } from "@/lib/types";

function block(id: string, type = "box", children: Block[] = []): Block {
  return { id, type, props: {}, styles: {}, children };
}

describe("deriveContextMenuView", () => {
  it("returns null when the targeted block is gone", () => {
    const tree = [block("a")];
    expect(deriveContextMenuView(tree, { x: 0, y: 0, blockId: "missing" }, 1000, 800)).toBeNull();
  });

  it("returns null for an empty tree", () => {
    expect(deriveContextMenuView([], { x: 0, y: 0, blockId: "x" }, 1000, 800)).toBeNull();
  });

  it("derives placement + siblingCount for a root-level block", () => {
    const tree = [block("a"), block("b")];
    const view = deriveContextMenuView(tree, { x: 10, y: 20, blockId: "a" }, 1000, 800);
    expect(view).not.toBeNull();
    if (!view) return;
    expect(view.block.id).toBe("a");
    expect(view.loc).toEqual({ parentId: null, index: 0 });
    expect(view.isComponent).toBe(false);
    expect(view.siblingCount).toBe(2); // tree.length branch
    expect(view.x).toBe(10);
    expect(view.y).toBe(20);
  });

  it("uses the parent's child count for a nested block", () => {
    const tree = [block("p", "box", [block("c1"), block("c2"), block("c3")])];
    const view = deriveContextMenuView(tree, { x: 5, y: 5, blockId: "c2" }, 1000, 800);
    expect(view).not.toBeNull();
    if (!view) return;
    expect(view.loc).toEqual({ parentId: "p", index: 1 });
    expect(view.siblingCount).toBe(3); // parent.children.length branch
  });

  it("flags a component block via isComponent", () => {
    const tree = [block("cmp", "component")];
    const view = deriveContextMenuView(tree, { x: 0, y: 0, blockId: "cmp" }, 1000, 800);
    expect(view?.isComponent).toBe(true);
  });

  it("clamps x/y so the menu stays inside the viewport", () => {
    const tree = [block("a")];
    const view = deriveContextMenuView(tree, { x: 9999, y: 9999, blockId: "a" }, 500, 400);
    expect(view).not.toBeNull();
    if (!view) return;
    expect(view.x).toBe(500 - MENU_W - 8);
    expect(view.y).toBe(400 - 340);
  });
});
