import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Block } from "@/lib/types";

// Mock the two heavy children so we can assert CanvasContent's branching without
// pulling in the real BlockRenderer / editor-block subtree (stores, dnd-kit, …).
vi.mock("@/components/BlockRenderer", () => ({
  BlockRenderer: ({ tree, animate }: { tree: Block[]; animate?: boolean }) => (
    <div data-testid="block-renderer" data-count={tree.length} data-animate={String(!!animate)} />
  ),
}));

vi.mock("@/components/editor/EditorBlock", () => ({
  SlottedChildren: ({ items, emptyMinHeight }: { items: Block[]; emptyMinHeight?: number }) => (
    <div
      data-testid="slotted-children"
      data-count={items.length}
      data-empty-min-height={emptyMinHeight == null ? "" : String(emptyMinHeight)}
    />
  ),
}));

import { CanvasContent } from "@/components/editor/Canvas.helpers";

function block(id: string): Block {
  return { id, type: "Section", props: {}, children: [] } as unknown as Block;
}

const baseProps = {
  previewMode: false,
  tree: [] as Block[],
  header: [] as Block[],
  footer: [] as Block[],
  componentsMap: {},
  collectionsMap: {},
} as const;

describe("CanvasContent", () => {
  it("preview mode with header + footer renders three BlockRenderers", () => {
    render(
      <CanvasContent
        {...baseProps}
        previewMode
        tree={[block("a"), block("b")]}
        header={[block("h")]}
        footer={[block("f")]}
      />,
    );
    const renderers = screen.getAllByTestId("block-renderer");
    expect(renderers).toHaveLength(3);
    // header(1), tree(2), footer(1)
    expect(renderers.map((r) => r.getAttribute("data-count"))).toEqual(["1", "2", "1"]);
    expect(renderers.every((r) => r.getAttribute("data-animate") === "true")).toBe(true);
    expect(screen.queryByTestId("slotted-children")).toBeNull();
  });

  it("preview mode without header/footer renders only the tree BlockRenderer", () => {
    render(
      <CanvasContent {...baseProps} previewMode tree={[block("a")]} header={[]} footer={[]} />,
    );
    const renderers = screen.getAllByTestId("block-renderer");
    expect(renderers).toHaveLength(1);
    expect(renderers[0].getAttribute("data-count")).toBe("1");
  });

  it("preview mode with header only (no footer) renders two BlockRenderers", () => {
    render(
      <CanvasContent
        {...baseProps}
        previewMode
        tree={[block("a")]}
        header={[block("h")]}
        footer={[]}
      />,
    );
    expect(screen.getAllByTestId("block-renderer")).toHaveLength(2);
  });

  it("preview mode with footer only (no header) renders two BlockRenderers", () => {
    render(
      <CanvasContent
        {...baseProps}
        previewMode
        tree={[block("a")]}
        header={[]}
        footer={[block("f")]}
      />,
    );
    expect(screen.getAllByTestId("block-renderer")).toHaveLength(2);
  });

  it("edit mode with empty tree renders the empty SlottedChildren placeholder", () => {
    render(<CanvasContent {...baseProps} tree={[]} />);
    const slotted = screen.getByTestId("slotted-children");
    expect(slotted.getAttribute("data-count")).toBe("0");
    expect(slotted.getAttribute("data-empty-min-height")).toBe("360");
    // No "Add section" button in the empty state.
    expect(screen.queryByText("Add section")).toBeNull();
    expect(screen.queryByTestId("block-renderer")).toBeNull();
  });

  it("edit mode with a non-empty tree renders SlottedChildren + Add section button", () => {
    render(<CanvasContent {...baseProps} tree={[block("a"), block("b"), block("c")]} />);
    const slotted = screen.getByTestId("slotted-children");
    expect(slotted.getAttribute("data-count")).toBe("3");
    // emptyMinHeight is not passed in the populated branch.
    expect(slotted.getAttribute("data-empty-min-height")).toBe("");
    const button = screen.getByText("Add section").closest("button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("data-open-inserter")).toBe("root");
  });
});
