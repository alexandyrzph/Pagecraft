import { endpoints } from "@/lib/api/endpoints";
import type { Block, Seo, Theme } from "@/lib/types";

/** Which editor surface the active session is persisting to. */
export type SaveMode = "site" | "collection" | "component" | "page";

/** The flags that select the active save mode (mutually exclusive in priority). */
export type SaveModeFlags = {
  isSiteMode: boolean;
  isCollectionMode: boolean;
  isComponentMode: boolean;
};

/** The slice of editor state the save request reads. */
export type SaveState = {
  pageId: string;
  title: string;
  tree: Block[];
  seo: Seo;
  theme: Theme;
};

export function resolveSaveMode(flags: SaveModeFlags): SaveMode {
  if (flags.isSiteMode) return "site";
  if (flags.isCollectionMode) return "collection";
  if (flags.isComponentMode) return "component";
  return "page";
}

export function saveUrl(mode: SaveMode, pageId: string): string {
  switch (mode) {
    case "site":
      return endpoints.site;
    case "collection":
      return endpoints.collections.byId(pageId);
    case "component":
      return endpoints.components.byId(pageId);
    default:
      return endpoints.pages.byId(pageId);
  }
}

export function savePayload(
  mode: SaveMode,
  s: SaveState,
  siteRegion?: "header" | "footer",
): Record<string, unknown> {
  switch (mode) {
    case "site":
      return { [siteRegion ?? "header"]: s.tree };
    case "collection":
      return { detailTemplate: s.tree };
    case "component":
      return { name: s.title, content: s.tree };
    default:
      return { title: s.title, content: s.tree, seo: s.seo, theme: s.theme };
  }
}
