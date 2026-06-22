import { describe, it, expect } from "vitest";
import { responsiveCss, resolveStyles, styleDeclarations, BREAKPOINTS } from "@/lib/blocks/styles";
import {
  normalizeBg,
  camelToKebab,
  cssText,
  flatten,
  collectStyles,
  mediaBlock,
  hideDeclaration,
} from "@/lib/blocks/styles.helpers";
import type { Block } from "@/lib/types";

const block = (id: string, extra: Partial<Block> = {}): Block => ({
  id,
  type: "text",
  props: {},
  styles: {},
  children: [],
  ...extra,
});

describe("normalizeBg", () => {
  it("returns empty/whitespace input trimmed", () => {
    expect(normalizeBg("")).toBe("");
    expect(normalizeBg("   ")).toBe("");
  });

  it("passes through already-valid CSS image functions", () => {
    expect(normalizeBg("url(/a.png)")).toBe("url(/a.png)");
    expect(normalizeBg("linear-gradient(red, blue)")).toBe("linear-gradient(red, blue)");
    expect(normalizeBg("radial-gradient(red, blue)")).toBe("radial-gradient(red, blue)");
    expect(normalizeBg("conic-gradient(red, blue)")).toBe("conic-gradient(red, blue)");
    expect(normalizeBg("none")).toBe("none");
  });

  it('wraps a bare URL in url("...")', () => {
    expect(normalizeBg("/img/hero.jpg")).toBe('url("/img/hero.jpg")');
    expect(normalizeBg("  /img/hero.jpg  ")).toBe('url("/img/hero.jpg")');
  });
});

describe("camelToKebab", () => {
  it("converts camelCase property names to kebab-case", () => {
    expect(camelToKebab("backgroundColor")).toBe("background-color");
    expect(camelToKebab("color")).toBe("color");
    expect(camelToKebab("borderTopLeftRadius")).toBe("border-top-left-radius");
  });
});

describe("cssText", () => {
  it("serializes props, skipping null/empty values", () => {
    expect(
      cssText({ color: "#111", fontSize: "16px", lineHeight: "", letterSpacing: undefined }),
    ).toBe("color: #111; font-size: 16px;");
  });

  it("normalizes a bare backgroundImage URL", () => {
    expect(cssText({ backgroundImage: "/bg.png" })).toBe('background-image: url("/bg.png");');
  });

  it("leaves a gradient backgroundImage untouched", () => {
    expect(cssText({ backgroundImage: "linear-gradient(red, blue)" })).toBe(
      "background-image: linear-gradient(red, blue);",
    );
  });

  it("returns an empty string for an empty object", () => {
    expect(cssText({})).toBe("");
  });

  it("stringifies non-string values", () => {
    expect(cssText({ opacity: 0.5 as unknown as string })).toBe("opacity: 0.5;");
  });
});

describe("styleDeclarations (public wrapper over cssText)", () => {
  it("matches cssText output", () => {
    const sp = { color: "red", backgroundImage: "/x.png" };
    expect(styleDeclarations(sp)).toBe(cssText(sp));
    expect(styleDeclarations(sp)).toBe('color: red; background-image: url("/x.png");');
  });
});

describe("flatten", () => {
  it("collects blocks depth-first including nested children", () => {
    const tree = [
      block("a", {
        children: [block("b", { children: [block("c")] }), block("d")],
      }),
      block("e"),
    ];
    expect(flatten(tree).map((b) => b.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns an empty array for an empty tree", () => {
    expect(flatten([])).toEqual([]);
  });
});

describe("collectStyles", () => {
  it("buckets desktop/tablet/mobile rules and skips empty declarations", () => {
    const tree = [
      block("a", {
        styles: {
          desktop: { color: "red" },
          tablet: {},
          mobile: { color: "blue" },
        },
      }),
      block("b", { styles: { tablet: { fontSize: "12px" } } }),
    ];
    const { rules, hidden } = collectStyles(tree);
    expect(rules.desktop).toEqual([".b-a { color: red; }"]);
    expect(rules.tablet).toEqual([".b-b { font-size: 12px; }"]);
    expect(rules.mobile).toEqual([".b-a { color: blue; }"]);
    expect(hidden.desktop).toEqual([]);
    expect(hidden.tablet).toEqual([]);
    expect(hidden.mobile).toEqual([]);
  });

  it("collects hidden selectors per viewport", () => {
    const tree = [
      block("a", { props: { hidden: { desktop: true, mobile: true } } }),
      block("b", { props: { hidden: { tablet: true } } }),
      block("c", { props: { hidden: {} } }),
      block("d"),
    ];
    const { hidden } = collectStyles(tree);
    expect(hidden.desktop).toEqual([".b-a"]);
    expect(hidden.tablet).toEqual([".b-b"]);
    expect(hidden.mobile).toEqual([".b-a"]);
  });
});

describe("mediaBlock", () => {
  it("returns an empty string when there are no rule lines", () => {
    expect(mediaBlock("(max-width: 640px)", [])).toBe("");
  });

  it("wraps rule lines in a media query with leading newline", () => {
    expect(mediaBlock("(max-width: 640px)", [".b-a { color: red; }"])).toBe(
      "\n@media (max-width: 640px) {\n.b-a { color: red; }\n}",
    );
  });
});

describe("hideDeclaration", () => {
  it("returns display:none for the public page", () => {
    expect(hideDeclaration(false)).toBe("display: none !important;");
    expect(hideDeclaration(undefined)).toBe("display: none !important;");
  });

  it("returns a ghost outline for the editor", () => {
    expect(hideDeclaration(true)).toBe(
      "opacity: 0.35 !important; outline: 1px dashed rgba(99,102,241,0.7); outline-offset: -1px;",
    );
  });
});

describe("resolveStyles cascade", () => {
  it("merges desktop → tablet → mobile (desktop-first)", () => {
    const styles = {
      desktop: { color: "#111", fontSize: "20px" },
      tablet: { fontSize: "16px" },
      mobile: { fontSize: "14px" },
    };
    expect(resolveStyles(styles, "desktop")).toEqual({ color: "#111", fontSize: "20px" });
    expect(resolveStyles(styles, "tablet")).toEqual({ color: "#111", fontSize: "16px" });
    expect(resolveStyles(styles, "mobile")).toEqual({ color: "#111", fontSize: "14px" });
  });

  it("normalizes backgroundImage in inline styles", () => {
    expect(resolveStyles({ desktop: { backgroundImage: "/bg.png" } }, "desktop")).toEqual({
      backgroundImage: 'url("/bg.png")',
    });
  });

  it("returns an empty object when no styles match the viewport", () => {
    expect(resolveStyles({ tablet: { color: "red" } }, "desktop")).toEqual({});
  });
});

describe("responsiveCss assembly", () => {
  it("emits base desktop rules with no media query", () => {
    const css = responsiveCss([block("a", { styles: { desktop: { color: "red" } } })]);
    expect(css).toBe(".b-a { color: red; }");
  });

  it("wraps tablet and mobile rules in max-width media queries (in order)", () => {
    const css = responsiveCss([
      block("a", {
        styles: {
          desktop: { color: "red" },
          tablet: { color: "green" },
          mobile: { color: "blue" },
        },
      }),
    ]);
    expect(css).toBe(
      ".b-a { color: red; }" +
        `\n@media (max-width: ${BREAKPOINTS.tablet}px) {\n.b-a { color: green; }\n}` +
        `\n@media (max-width: ${BREAKPOINTS.mobile}px) {\n.b-a { color: blue; }\n}`,
    );
  });

  it("emits no media queries when only desktop styles exist", () => {
    const css = responsiveCss([block("a", { styles: { desktop: { color: "red" } } })]);
    expect(css).not.toContain("@media");
  });

  it("returns an empty string for a tree with no styles", () => {
    expect(responsiveCss([block("a")])).toBe("");
  });

  it("emits bounded visibility ranges per breakpoint (public)", () => {
    const css = responsiveCss([
      block("a", { props: { hidden: { desktop: true } } }),
      block("b", { props: { hidden: { tablet: true } } }),
      block("c", { props: { hidden: { mobile: true } } }),
    ]);
    expect(css).toContain(
      `@media (min-width: ${BREAKPOINTS.tablet + 1}px) {\n.b-a { display: none !important; }\n}`,
    );
    expect(css).toContain(
      `@media (min-width: ${BREAKPOINTS.mobile + 1}px) and (max-width: ${BREAKPOINTS.tablet}px) {\n.b-b { display: none !important; }\n}`,
    );
    expect(css).toContain(
      `@media (max-width: ${BREAKPOINTS.mobile}px) {\n.b-c { display: none !important; }\n}`,
    );
  });

  it("ghosts hidden blocks in editor mode", () => {
    const css = responsiveCss([block("a", { props: { hidden: { desktop: true } } })], {
      editable: true,
    });
    expect(css).toContain("opacity: 0.35 !important");
    expect(css).not.toContain("display: none");
  });

  it("groups multiple selectors hidden at the same breakpoint", () => {
    const css = responsiveCss([
      block("a", { props: { hidden: { mobile: true } } }),
      block("b", { props: { hidden: { mobile: true } } }),
    ]);
    expect(css).toContain(
      `@media (max-width: ${BREAKPOINTS.mobile}px) {\n.b-a { display: none !important; }\n.b-b { display: none !important; }\n}`,
    );
  });

  it("handles nested children blocks", () => {
    const css = responsiveCss([
      block("parent", {
        styles: { desktop: { color: "red" } },
        children: [block("child", { styles: { desktop: { color: "blue" } } })],
      }),
    ]);
    expect(css).toBe(".b-parent { color: red; }\n.b-child { color: blue; }");
  });
});
