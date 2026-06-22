import { describe, it, expect, vi, afterEach } from "vitest";
import type { Block } from "@/lib/types";
import {
  blockClassName,
  buildContainerChildren,
  scrollNewIntoView,
} from "@/components/editor/EditorBlock.helpers";

function block(partial: Partial<Block> & { id: string; type: string }): Block {
  return {
    props: {},
    styles: {},
    children: [],
    ...partial,
  };
}

describe("blockClassName", () => {
  it("emits the per-block hook class with no text style or author classes", () => {
    expect(blockClassName(block({ id: "abc", type: "heading" }))).toBe("b-abc");
  });

  it("includes the text-style class when props.textStyle is set", () => {
    const cls = blockClassName(block({ id: "x1", type: "text", props: { textStyle: "lead" } }));
    expect(cls).toContain("b-x1");
    expect(cls).toContain("ts-lead");
  });

  it("appends author-set htmlClass (trimmed) after the hook classes", () => {
    const cls = blockClassName(
      block({ id: "x2", type: "text", props: { textStyle: "lead", htmlClass: "  hero big  " } }),
    );
    expect(cls).toContain("b-x2");
    expect(cls).toContain("ts-lead");
    expect(cls).toContain("hero");
    expect(cls).toContain("big");
  });

  it("does not crash and omits the ts- class when textStyle is empty string", () => {
    const cls = blockClassName(block({ id: "x3", type: "text", props: { textStyle: "" } }));
    expect(cls).toBe("b-x3");
    expect(cls).not.toContain("ts-");
  });
});

describe("buildContainerChildren", () => {
  const renderChild = (c: Block, i: number) => ({ kind: "child", id: c.id, i });
  const renderSlotted = (items: Block[], emptyMinHeight?: number) => ({
    kind: "slotted",
    count: items.length,
    emptyMinHeight,
  });

  it("returns undefined for a non-container block (so render sees no children)", () => {
    const result = buildContainerChildren(
      block({ id: "h", type: "heading" }),
      renderChild as never,
      renderSlotted as never,
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined for an unknown block type", () => {
    const result = buildContainerChildren(
      block({ id: "u", type: "totally-unknown-type" }),
      renderChild as never,
      renderSlotted as never,
    );
    expect(result).toBeUndefined();
  });

  it("maps children directly for a fixed-strategy container (columns)", () => {
    const kids = [block({ id: "c1", type: "column" }), block({ id: "c2", type: "column" })];
    const result = buildContainerChildren(
      block({ id: "cols", type: "columns", children: kids }),
      renderChild as never,
      renderSlotted as never,
    ) as unknown as Array<{ kind: string; id: string; i: number }>;
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(["c1", "c2"]);
    expect(result.map((r) => r.i)).toEqual([0, 1]);
    expect(result.every((r) => r.kind === "child")).toBe(true);
  });

  it("renders slotted children for a slotted container, forwarding emptyMinHeight", () => {
    const kids = [block({ id: "s1", type: "heading" })];
    const result = buildContainerChildren(
      block({ id: "sec", type: "section", children: kids }),
      renderChild as never,
      renderSlotted as never,
    ) as unknown as { kind: string; count: number; emptyMinHeight?: number };
    expect(result.kind).toBe("slotted");
    expect(result.count).toBe(1);
    // section's emptyMinHeight from the registry
    expect(result.emptyMinHeight).toBe(80);
  });

  it("returns undefined for a container whose registry def lacks isContainer (column slotted forwards minHeight)", () => {
    const kids = [block({ id: "k1", type: "heading" })];
    const result = buildContainerChildren(
      block({ id: "col", type: "column", children: kids }),
      renderChild as never,
      renderSlotted as never,
    ) as unknown as { kind: string; count: number; emptyMinHeight?: number };
    expect(result.kind).toBe("slotted");
    expect(result.count).toBe(1);
    // column's emptyMinHeight from the registry
    expect(result.emptyMinHeight).toBe(64);
  });
});

describe("scrollNewIntoView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("schedules a frame that scrolls the node into view and clears the marker", () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const scrollIntoView = vi.fn();
    const clearLastAdded = vi.fn();
    const ref = { current: { scrollIntoView } as unknown as HTMLDivElement };

    const cleanup = scrollNewIntoView(ref, clearLastAdded);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(clearLastAdded).toHaveBeenCalledTimes(1);
    expect(typeof cleanup).toBe("function");
  });

  it("does not throw when the ref is detached, and cancels the frame on cleanup", () => {
    const cancel = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 7;
    });
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const clearLastAdded = vi.fn();
    const ref = { current: null as HTMLDivElement | null };

    const cleanup = scrollNewIntoView(ref, clearLastAdded);
    expect(clearLastAdded).toHaveBeenCalledTimes(1);

    cleanup();
    expect(cancel).toHaveBeenCalledWith(7);
  });
});
