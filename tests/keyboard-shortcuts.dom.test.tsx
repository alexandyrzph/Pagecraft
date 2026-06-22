import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEditor } from "@/store/editor-store";
import { useCanvasZoom } from "@/store/canvas-zoom";
import { useKeyboardShortcuts } from "@/components/editor/use-keyboard-shortcuts";

function press(target: EventTarget, init: KeyboardEventInit) {
  target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
}

function seed() {
  useEditor.getState().init({ id: "p1", title: "T", slug: "t", published: false, tree: [] });
  useEditor.getState().addBlock("heading", null, 0);
  const id = useEditor.getState().tree[0].id;
  useEditor.getState().select(id);
  return id;
}

describe("useKeyboardShortcuts (characterization)", () => {
  let save: Mock<() => void>;
  let togglePalette: Mock<() => void>;
  let unmount: () => void;

  beforeEach(() => {
    save = vi.fn<() => void>();
    togglePalette = vi.fn<() => void>();
    ({ unmount } = renderHook(() => useKeyboardShortcuts({ save, togglePalette, frame: null })));
  });

  afterEach(() => {
    unmount();
    vi.restoreAllMocks();
    useCanvasZoom.getState().reset();
  });

  it("⌘K toggles the command palette", () => {
    press(window, { key: "k", metaKey: true });
    expect(togglePalette).toHaveBeenCalledTimes(1);
  });

  it("⌘S saves", () => {
    press(window, { key: "s", metaKey: true });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("⌘Z undoes and ⌘⇧Z redoes", () => {
    seed();
    useEditor.getState().addBlock("text", null, 1);
    expect(useEditor.getState().tree.length).toBe(2);
    press(window, { key: "z", metaKey: true });
    expect(useEditor.getState().tree.length).toBe(1);
    press(window, { key: "z", metaKey: true, shiftKey: true });
    expect(useEditor.getState().tree.length).toBe(2);
  });

  it("Escape clears the current selection", () => {
    seed();
    expect(useEditor.getState().selectedId).not.toBeNull();
    press(window, { key: "Escape" });
    expect(useEditor.getState().selectedId).toBeNull();
  });

  it("Delete/Backspace removes the selection", () => {
    seed();
    expect(useEditor.getState().tree.length).toBe(1);
    press(window, { key: "Delete" });
    expect(useEditor.getState().tree.length).toBe(0);
  });

  it("⌘D duplicates the selection", () => {
    seed();
    press(window, { key: "d", metaKey: true });
    expect(useEditor.getState().tree.length).toBe(2);
  });

  it("⌘C / ⌘X / ⌘V map to copy / cut / paste", () => {
    const id = seed();
    const st = useEditor.getState();
    const copy = vi.spyOn(st, "copy");
    press(window, { key: "c", metaKey: true });
    expect(copy).toHaveBeenCalledWith(id);

    const st2 = useEditor.getState();
    const cut = vi.spyOn(st2, "cut");
    press(window, { key: "x", metaKey: true });
    expect(cut).toHaveBeenCalledWith(id);

    const st3 = useEditor.getState();
    const paste = vi.spyOn(st3, "paste");
    press(window, { key: "v", metaKey: true });
    expect(paste).toHaveBeenCalledTimes(1);
  });

  it("⌘⌥C / ⌘⌥V map to copy / paste styles (by key code)", () => {
    const id = seed();
    const st = useEditor.getState();
    const copyStyles = vi.spyOn(st, "copyStyles");
    press(window, { code: "KeyC", key: "c", metaKey: true, altKey: true });
    expect(copyStyles).toHaveBeenCalledWith(id);

    const st2 = useEditor.getState();
    const pasteStyles = vi.spyOn(st2, "pasteStyles");
    press(window, { code: "KeyV", key: "v", metaKey: true, altKey: true });
    expect(pasteStyles).toHaveBeenCalledWith(id);
  });

  it("⌘+ / ⌘- / ⌘0 zoom the canvas", () => {
    expect(useCanvasZoom.getState().zoom).toBe(1);
    press(window, { key: "=", metaKey: true });
    expect(useCanvasZoom.getState().zoom).toBeGreaterThan(1);
    press(window, { key: "-", metaKey: true });
    press(window, { key: "-", metaKey: true });
    expect(useCanvasZoom.getState().zoom).toBeLessThan(1);
    press(window, { key: "0", metaKey: true });
    expect(useCanvasZoom.getState().zoom).toBe(1);
  });

  it("ignores edit-target keys while typing in a field (editing guard)", () => {
    seed();
    const input = document.createElement("input");
    document.body.appendChild(input);
    const st = useEditor.getState();
    const removeSelected = vi.spyOn(st, "removeSelected");
    press(input, { key: "Delete" });
    expect(removeSelected).not.toHaveBeenCalled();
    expect(useEditor.getState().tree.length).toBe(1);
    input.remove();
  });

  it("still runs global shortcuts (⌘S) while typing in a field", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    press(input, { key: "s", metaKey: true });
    expect(save).toHaveBeenCalledTimes(1);
    input.remove();
  });
});
