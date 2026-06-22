import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { CanvasFrame } from "@/components/editor/CanvasFrame";
import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";

// CanvasFrame portals its children into a real <iframe> and wires selection via
// a delegated `pointerdown` listener on the iframe document. jsdom fires the
// iframe `onLoad`, exposes `contentDocument`, and supports PointerEvent, so we
// can mount the frame, dispatch real pointerdowns inside it, and observe the
// editor store reacting through the internal `onDown` handler.

const flush = (ms = 80) => new Promise((r) => setTimeout(r, ms));

async function mountFrame(children: ReactNode) {
  const r = render(
    <CanvasFrame tree={[]} theme={{}} editable>
      {children}
    </CanvasFrame>,
  );
  await flush();
  const iframe = r.container.querySelector("iframe") as HTMLIFrameElement;
  const doc = iframe.contentDocument as Document;
  const fire = (selector: string, init?: PointerEventInit) =>
    (doc.querySelector(selector) as HTMLElement).dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, ...init }),
    );
  // React holds the iframe body as a portal container; unmounting it after the
  // document teardown trips a benign jsdom removeChild error, so unmount here
  // (and swallow) to keep the global cleanup a no-op.
  const done = () => {
    try {
      r.unmount();
    } catch {
      /* portal-in-iframe teardown quirk */
    }
  };
  return { fire, done };
}

beforeEach(() => {
  useEditor.setState({ selectedId: null, selectedIds: [], hoveredId: null });
  useEditorUI.setState({ ai: null, inserter: null, ctx: null });
});

describe("CanvasFrame onDown", () => {
  it("selects the block under a plain pointerdown", async () => {
    const { fire, done } = await mountFrame(
      <div data-block-id="b-1" id="t">
        hi
      </div>,
    );
    fire("#t");
    await flush(5);
    expect(useEditor.getState().selectedId).toBe("b-1");
    done();
  });

  it("toggles the block into the multi-selection on shift+pointerdown", async () => {
    const { fire, done } = await mountFrame(
      <div data-block-id="b-2" id="t">
        hi
      </div>,
    );
    fire("#t", { shiftKey: true });
    await flush(5);
    expect(useEditor.getState().selectedIds).toContain("b-2");
    done();
  });

  it("toggles the block into the multi-selection on meta+pointerdown", async () => {
    const { fire, done } = await mountFrame(
      <div data-block-id="b-3" id="t">
        hi
      </div>,
    );
    fire("#t", { metaKey: true });
    await flush(5);
    expect(useEditor.getState().selectedIds).toContain("b-3");
    done();
  });

  it("clears the selection when pointerdown hits no block", async () => {
    useEditor.setState({ selectedId: "stale", selectedIds: ["stale"] });
    const { fire, done } = await mountFrame(<div id="t">no id here</div>);
    fire("#t");
    await flush(5);
    expect(useEditor.getState().selectedId).toBeNull();
    done();
  });

  it("lets an action button consume the pointerdown before selection runs", async () => {
    useEditor.setState({ selectedId: "keep", selectedIds: ["keep"] });
    const { fire, done } = await mountFrame(
      <button data-open-ai id="t">
        generate
      </button>,
    );
    fire("#t");
    await flush(5);
    // handleActionButtons consumed the event: AI bar opened, selection untouched.
    expect(useEditorUI.getState().ai).not.toBeNull();
    expect(useEditor.getState().selectedId).toBe("keep");
    done();
  });
});
