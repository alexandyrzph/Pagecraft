// Unit tests for the pure save-dispatch helpers extracted from
// useEditorPersistence: mode resolution (priority order), the URL builder, and
// the payload builder (every mode + the site-region default).
import { describe, it, expect } from "vitest";
import {
  resolveSaveMode,
  saveUrl,
  savePayload,
  type SaveModeFlags,
  type SaveState,
} from "@/components/editor/use-editor-persistence.helpers";
import { endpoints } from "@/lib/api/endpoints";
import type { Block } from "@/lib/types";

const tree: Block[] = [{ id: "b1", type: "Heading", props: {}, styles: {}, children: [] }];

function flags(over: Partial<SaveModeFlags> = {}): SaveModeFlags {
  return { isSiteMode: false, isCollectionMode: false, isComponentMode: false, ...over };
}

function state(over: Partial<SaveState> = {}): SaveState {
  return {
    pageId: "p1",
    title: "My Page",
    tree,
    seo: { metaDescription: "d" },
    theme: { brand: "#fff" },
    ...over,
  };
}

describe("resolveSaveMode", () => {
  it("returns 'page' when no mode flag is set", () => {
    expect(resolveSaveMode(flags())).toBe("page");
  });

  it("returns 'site' when site mode is set", () => {
    expect(resolveSaveMode(flags({ isSiteMode: true }))).toBe("site");
  });

  it("returns 'collection' when only collection mode is set", () => {
    expect(resolveSaveMode(flags({ isCollectionMode: true }))).toBe("collection");
  });

  it("returns 'component' when only component mode is set", () => {
    expect(resolveSaveMode(flags({ isComponentMode: true }))).toBe("component");
  });

  it("prioritizes site > collection > component", () => {
    expect(
      resolveSaveMode(flags({ isSiteMode: true, isCollectionMode: true, isComponentMode: true })),
    ).toBe("site");
    expect(resolveSaveMode(flags({ isCollectionMode: true, isComponentMode: true }))).toBe(
      "collection",
    );
  });
});

describe("saveUrl", () => {
  it("uses the site endpoint for site mode", () => {
    expect(saveUrl("site", "p1")).toBe(endpoints.site);
  });

  it("uses the collection endpoint for collection mode", () => {
    expect(saveUrl("collection", "p1")).toBe(endpoints.collections.byId("p1"));
  });

  it("uses the component endpoint for component mode", () => {
    expect(saveUrl("component", "p1")).toBe(endpoints.components.byId("p1"));
  });

  it("uses the page endpoint for page mode", () => {
    expect(saveUrl("page", "p1")).toBe(endpoints.pages.byId("p1"));
  });
});

describe("savePayload", () => {
  it("writes the tree under the given site region", () => {
    expect(savePayload("site", state(), "footer")).toEqual({ footer: tree });
  });

  it("defaults the site region to header", () => {
    expect(savePayload("site", state())).toEqual({ header: tree });
  });

  it("writes detailTemplate for collection mode", () => {
    expect(savePayload("collection", state())).toEqual({ detailTemplate: tree });
  });

  it("writes name + content for component mode", () => {
    expect(savePayload("component", state())).toEqual({ name: "My Page", content: tree });
  });

  it("writes the full page payload for page mode", () => {
    const s = state();
    expect(savePayload("page", s)).toEqual({
      title: "My Page",
      content: tree,
      seo: s.seo,
      theme: s.theme,
    });
  });

  it("ignores the site region for non-site modes", () => {
    expect(savePayload("page", state(), "footer")).toEqual({
      title: "My Page",
      content: tree,
      seo: { metaDescription: "d" },
      theme: { brand: "#fff" },
    });
  });
});
