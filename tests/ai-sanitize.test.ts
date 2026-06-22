import { describe, it, expect } from "vitest";
import type { Block } from "@/lib/types";
import { sanitizeGeneratedBlocks } from "@/lib/ai";

function deepestSectionLevels(b: Block): number {
  let depth = 1;
  let node = b;
  while (node.children.length > 0) {
    depth++;
    node = node.children[0];
  }
  return depth;
}

describe("sanitizeGeneratedBlocks — guards", () => {
  it("returns [] for non-array input", () => {
    expect(sanitizeGeneratedBlocks("x")).toEqual([]);
    expect(sanitizeGeneratedBlocks(null)).toEqual([]);
    expect(sanitizeGeneratedBlocks(undefined)).toEqual([]);
    expect(sanitizeGeneratedBlocks({})).toEqual([]);
    expect(sanitizeGeneratedBlocks(42)).toEqual([]);
  });

  it("skips falsy / non-object / typeless entries", () => {
    const out = sanitizeGeneratedBlocks([
      null,
      undefined,
      "string",
      7,
      {},
      { type: 123 },
      { type: "hero" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("hero");
  });

  it("drops unknown and child-only / synthetic block types", () => {
    const out = sanitizeGeneratedBlocks([
      { type: "evil" },
      { type: "column" },
      { type: "component" },
      { type: "hero" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("hero");
  });
});

describe("sanitizeGeneratedBlocks — props copying", () => {
  it("copies only registry-known props and gives a fresh id", () => {
    const out = sanitizeGeneratedBlocks([
      { type: "heading", props: { text: "Hi", level: "h1", bogus: "x" } },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].props.text).toBe("Hi");
    expect(out[0].props.level).toBe("h1");
    expect(out[0].props.bogus).toBeUndefined();
    expect(typeof out[0].id).toBe("string");
    expect(out[0].id.length).toBeGreaterThan(0);
  });

  it("ignores null / undefined prop values, keeping defaults", () => {
    const out = sanitizeGeneratedBlocks([
      { type: "heading", props: { text: null, level: undefined } },
    ]);
    expect(out[0].props.text).toBe("Your heading here");
    expect(out[0].props.level).toBe("h2");
  });

  it("leaves defaults intact when props is not an object", () => {
    const out = sanitizeGeneratedBlocks([{ type: "heading", props: "nope" }, { type: "heading" }]);
    expect(out[0].props.text).toBe("Your heading here");
    expect(out[1].props.text).toBe("Your heading here");
  });

  it("keeps array-valued props like feature items", () => {
    const out = sanitizeGeneratedBlocks([
      { type: "features", props: { items: [{ icon: "Zap", title: "Fast", text: "x" }] } },
    ]);
    expect(Array.isArray(out[0].props.items)).toBe(true);
    expect((out[0].props.items as { title: string }[])[0].title).toBe("Fast");
  });
});

describe("sanitizeGeneratedBlocks — styles", () => {
  it("merges safe AI styles over the block defaults and drops unsafe ones", () => {
    const out = sanitizeGeneratedBlocks([
      {
        type: "hero",
        props: { title: "T" },
        styles: {
          desktop: { backgroundColor: "#000000", boxShadow: "0 1px 2px rgba(0,0,0,.2)" },
          mobile: { color: "red; }</style>" },
          bogusViewport: { color: "#fff" },
        },
      },
    ]);
    expect(out[0].styles.desktop?.backgroundColor).toBe("#000000");
    expect(out[0].styles.desktop?.boxShadow).toBe("0 1px 2px rgba(0,0,0,.2)");
    // unsafe value rejected → mobile viewport never created
    expect(out[0].styles.mobile).toBeUndefined();
  });
});

describe("sanitizeGeneratedBlocks — containers & recursion", () => {
  it("sanitizes children only for container blocks, dropping invalid kids", () => {
    const out = sanitizeGeneratedBlocks([
      {
        type: "section",
        children: [{ type: "heading", props: { text: "H" } }, { type: "evil" }],
      },
    ]);
    expect(out[0].type).toBe("section");
    expect(out[0].children.map((c) => c.type)).toEqual(["heading"]);
  });

  it("keeps default children when a container's children is not an array", () => {
    const out = sanitizeGeneratedBlocks([{ type: "columns", children: "nope" }]);
    expect(out[0].type).toBe("columns");
    expect(out[0].children.map((c) => c.type)).toEqual(["column", "column"]);
  });

  it("does not recurse into a non-container's children", () => {
    const out = sanitizeGeneratedBlocks([
      { type: "heading", props: { text: "x" }, children: [{ type: "hero" }] },
    ]);
    expect(out[0].children).toEqual([]);
  });

  it("stops recursing past the depth limit", () => {
    let node: unknown = { type: "heading", props: { text: "deep" } };
    for (let i = 0; i < 8; i++) node = { type: "section", children: [node] };
    const out = sanitizeGeneratedBlocks([node]);
    // depth>5 truncates: the section processed at depth 5 gets empty children.
    expect(deepestSectionLevels(out[0])).toBe(6);
  });
});
