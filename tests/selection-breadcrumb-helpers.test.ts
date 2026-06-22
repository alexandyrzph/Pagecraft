import { describe, it, expect } from "vitest";
import { crumbLabel, deriveBreadcrumb } from "@/components/editor/SelectionBreadcrumb.helpers";
import { getDefinition } from "@/lib/blocks/registry";
import type { Block } from "@/lib/types";
import type { ComponentItem } from "@/components/editor/components-context";

function block(id: string, type: string, props: Record<string, unknown> = {}): Block {
  return { id, type, props, styles: {}, children: [] };
}

describe("deriveBreadcrumb", () => {
  it("hides the HUD when nothing is selected", () => {
    expect(deriveBreadcrumb(null, [], [], false, false)).toEqual({
      multi: false,
      path: null,
      show: false,
    });
  });

  it("resolves the ancestor path for a single selection", () => {
    const tree = [block("h", "heading")];
    const d = deriveBreadcrumb("h", ["h"], tree, false, false);
    expect(d.multi).toBe(false);
    expect(d.path).toEqual([tree[0]]);
    expect(d.show).toBe(true);
  });

  it("flags a multi-selection even with no resolvable path", () => {
    const d = deriveBreadcrumb(null, ["a", "b"], [], false, false);
    expect(d.multi).toBe(true);
    expect(d.path).toBeNull();
    expect(d.show).toBe(true);
  });

  it("hides in preview mode", () => {
    const tree = [block("h", "heading")];
    expect(deriveBreadcrumb("h", ["h"], tree, true, false).show).toBe(false);
  });

  it("hides while the DOM-tree drawer is open", () => {
    const tree = [block("h", "heading")];
    expect(deriveBreadcrumb("h", ["h"], tree, false, true).show).toBe(false);
  });

  it("hides when the selected id resolves to no block and is not multi", () => {
    const tree = [block("h", "heading")];
    const d = deriveBreadcrumb("ghost", ["ghost"], tree, false, false);
    expect(d.path).toBeNull();
    expect(d.show).toBe(false);
  });
});

describe("crumbLabel", () => {
  const comp: ComponentItem = { id: "cmp1", name: "Hero Card", content: [] };
  const map: Record<string, ComponentItem> = { cmp1: comp };

  it("uses the component name for a known component instance", () => {
    expect(crumbLabel(block("c", "component", { componentId: "cmp1" }), undefined, map)).toBe(
      "Hero Card",
    );
  });

  it("falls back to 'Component' for an unknown component instance", () => {
    expect(crumbLabel(block("c", "component", { componentId: "missing" }), undefined, map)).toBe(
      "Component",
    );
    expect(crumbLabel(block("c", "component"), undefined, {})).toBe("Component");
  });

  it("uses the registry label for a normal block", () => {
    expect(crumbLabel(block("h", "heading"), getDefinition("heading"), map)).toBe("Heading");
  });

  it("falls back to the raw type when no definition is given", () => {
    expect(crumbLabel(block("x", "mystery"), undefined, map)).toBe("mystery");
  });
});
