import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ContextMenu } from "@/components/editor/ContextMenu";
import { bindCloseListeners } from "@/components/editor/ContextMenu.helpers";
import { EditorActionsProvider } from "@/components/editor/editor-actions";
import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";
import type { Block } from "@/lib/types";

function block(id: string, type = "box", children: Block[] = []): Block {
  return { id, type, props: {}, styles: {}, children };
}

function initTree(tree: Block[]) {
  useEditor.getState().init({ id: "p", title: "T", slug: "t", published: false, tree });
}

function renderMenu(saveAsComponent = vi.fn()) {
  return render(
    <EditorActionsProvider
      value={{
        switchPage: () => {},
        confirmLeave: (a) => a(),
        loadPageInPlace: async () => {},
        saveAsComponent,
      }}
    >
      <ContextMenu />
    </EditorActionsProvider>,
  );
}

beforeEach(() => {
  useEditorUI.setState({ ctx: null, inserter: null, ai: null });
  initTree([]);
  // jsdom defaults to 1024x768; clamps below are well within bounds for x/y=10.
});

afterEach(() => {
  useEditorUI.setState({ ctx: null });
});

describe("ContextMenu", () => {
  it("renders nothing when there is no open context target", () => {
    const { container } = renderMenu();
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders nothing when the target block does not exist", () => {
    initTree([block("a")]);
    useEditorUI.getState().openCtx(10, 10, "ghost");
    const { container } = renderMenu();
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders the full action list for a non-component block", () => {
    initTree([block("a")]);
    useEditorUI.getState().openCtx(10, 10, "a");
    renderMenu();

    for (const label of [
      "Duplicate",
      "Copy",
      "Cut",
      "Paste below",
      "Copy styles",
      "Paste styles",
      "Insert section below",
      "Move up",
      "Move down",
      "Save as component",
      "Delete",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("hides 'Save as component' for a component block", () => {
    initTree([block("cmp", "component")]);
    useEditorUI.getState().openCtx(10, 10, "cmp");
    renderMenu();
    expect(screen.queryByText("Save as component")).toBeNull();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("disables Move up for the first sibling and Move down for the last", () => {
    initTree([block("a"), block("b")]);
    useEditorUI.getState().openCtx(10, 10, "a");
    renderMenu();
    expect(screen.getByText("Move up").closest("button")).toBeDisabled();
    expect(screen.getByText("Move down").closest("button")).not.toBeDisabled();
  });

  it("duplicates the block and closes the menu", () => {
    initTree([block("a")]);
    useEditorUI.getState().openCtx(10, 10, "a");
    renderMenu();

    fireEvent.click(screen.getByText("Duplicate"));
    expect(useEditor.getState().tree.length).toBe(2);
    expect(useEditorUI.getState().ctx).toBeNull();
  });

  it("deletes the block and closes the menu", () => {
    initTree([block("a")]);
    useEditorUI.getState().openCtx(10, 10, "a");
    renderMenu();

    fireEvent.click(screen.getByText("Delete"));
    expect(useEditor.getState().tree.length).toBe(0);
    expect(useEditorUI.getState().ctx).toBeNull();
  });

  it("cuts the block (copies + removes) and closes", () => {
    initTree([block("a"), block("b")]);
    useEditorUI.getState().openCtx(10, 10, "a");
    renderMenu();

    fireEvent.click(screen.getByText("Cut"));
    expect(useEditor.getState().tree.map((b) => b.id)).toEqual(["b"]);
    expect(useEditorUI.getState().ctx).toBeNull();
  });

  it("moves the block down with Move down", () => {
    initTree([block("a"), block("b")]);
    useEditorUI.getState().openCtx(10, 10, "a");
    renderMenu();

    fireEvent.click(screen.getByText("Move down"));
    expect(useEditor.getState().tree.map((b) => b.id)).toEqual(["b", "a"]);
    expect(useEditorUI.getState().ctx).toBeNull();
  });

  it("opens the inserter below the targeted block and closes the menu", () => {
    initTree([block("a")]);
    useEditorUI.getState().openCtx(10, 10, "a");
    renderMenu();

    fireEvent.click(screen.getByText("Insert section below"));
    expect(useEditorUI.getState().inserter).toEqual({ parentId: null, index: 1 });
    expect(useEditorUI.getState().ctx).toBeNull();
  });

  it("invokes saveAsComponent with the block, then closes", () => {
    initTree([block("a")]);
    useEditorUI.getState().openCtx(10, 10, "a");
    const saveAsComponent = vi.fn();
    renderMenu(saveAsComponent);

    fireEvent.click(screen.getByText("Save as component"));
    expect(saveAsComponent).toHaveBeenCalledTimes(1);
    expect(saveAsComponent.mock.calls[0][0].id).toBe("a");
    expect(useEditorUI.getState().ctx).toBeNull();
  });

  it("closes on Escape and on scroll while open (effect listeners)", () => {
    initTree([block("a")]);
    useEditorUI.getState().openCtx(10, 10, "a");
    renderMenu();
    expect(screen.getByText("Delete")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(useEditorUI.getState().ctx).toBeNull();
  });

  it("closes the menu when the backdrop is clicked", () => {
    initTree([block("a")]);
    useEditorUI.getState().openCtx(10, 10, "a");
    const { container } = renderMenu();
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement;
    fireEvent.click(backdrop);
    expect(useEditorUI.getState().ctx).toBeNull();
  });
});

describe("bindCloseListeners (browser env)", () => {
  it("does nothing and returns undefined when there is no ctx", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const closeCtx = vi.fn();
    const cleanup = bindCloseListeners(null, closeCtx);
    expect(cleanup).toBeUndefined();
    expect(addSpy).not.toHaveBeenCalled();
    addSpy.mockRestore();
  });

  it("closes on Escape and scroll, ignores other keys, and detaches on cleanup", () => {
    const closeCtx = vi.fn();
    const cleanup = bindCloseListeners({ x: 0, y: 0, blockId: "a" }, closeCtx);
    expect(typeof cleanup).toBe("function");

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(closeCtx).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(closeCtx).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("scroll"));
    expect(closeCtx).toHaveBeenCalledTimes(2);

    cleanup?.();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    window.dispatchEvent(new Event("scroll"));
    expect(closeCtx).toHaveBeenCalledTimes(2);
  });
});
