import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import { SelectionBreadcrumb } from "@/components/editor/SelectionBreadcrumb";
import { ComponentsProvider, type ComponentItem } from "@/components/editor/components-context";
import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";
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

function renderBreadcrumb(components?: {
  list: ComponentItem[];
  map: Record<string, ComponentItem>;
}) {
  const c = components ?? { list: [], map: {} };
  return render(
    <ComponentsProvider value={{ ...c, refresh: async () => {} }}>
      <SelectionBreadcrumb />
    </ComponentsProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useEditorUI.setState({ domTree: false });
  useEditor.setState({ previewMode: false });
  initTree([]);
});

describe("SelectionBreadcrumb", () => {
  it("shows the bulk-action bar for a multi-selection and fires its actions", () => {
    initTree([block("b1", "heading"), block("b2", "text")]);
    useEditor.setState({ selectedId: "b1", selectedIds: ["b1", "b2"] });

    renderBreadcrumb();

    expect(screen.getByRole("toolbar", { name: "Selection actions" })).toBeInTheDocument();
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    // Empty clipboard → paste styles is a no-op, but it exercises the handler.
    fireEvent.click(screen.getByTitle("Paste styles"));

    fireEvent.click(screen.getByTitle("Duplicate"));
    expect(useEditor.getState().tree.length).toBe(4);

    fireEvent.click(screen.getByTitle("Clear"));
    expect(useEditor.getState().selectedId).toBeNull();
  });

  it("removes every selected block via the bulk Delete action", () => {
    initTree([block("b1", "heading"), block("b2", "text")]);
    useEditor.setState({ selectedId: "b1", selectedIds: ["b1", "b2"] });

    renderBreadcrumb();

    fireEvent.click(screen.getByTitle("Delete"));
    expect(useEditor.getState().tree.length).toBe(0);
  });

  it("shows the ancestor breadcrumb and selects an ancestor on click", () => {
    initTree([block("sec", "section", {}, [block("h1", "heading")])]);
    useEditor.getState().select("h1");

    renderBreadcrumb();

    const nav = screen.getByRole("navigation", { name: "Selected element path" });
    expect(within(nav).getByText("Heading")).toBeInTheDocument();

    const crumbs = within(nav).getAllByRole("button");
    expect(crumbs.length).toBe(2);

    fireEvent.click(crumbs[0]);
    expect(useEditor.getState().selectedId).toBe("sec");
  });

  it("labels a component crumb with the component's name", () => {
    const comp: ComponentItem = { id: "cmp1", name: "Hero Card", content: [] };
    initTree([block("c1", "component", { componentId: "cmp1" })]);
    useEditor.getState().select("c1");

    renderBreadcrumb({ list: [comp], map: { cmp1: comp } });

    expect(screen.getByText("Hero Card")).toBeInTheDocument();
  });

  it("renders nothing in preview mode", () => {
    initTree([block("b1", "heading")]);
    useEditor.getState().select("b1");
    useEditor.setState({ previewMode: true });

    renderBreadcrumb();

    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("renders nothing while the DOM-tree drawer is open", () => {
    initTree([block("b1", "heading")]);
    useEditor.getState().select("b1");
    useEditorUI.setState({ domTree: true });

    renderBreadcrumb();

    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("renders nothing when no block is selected", () => {
    initTree([block("b1", "heading")]);

    renderBreadcrumb();

    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});
