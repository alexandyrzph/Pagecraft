"use client";

import { useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { buildExportDocument } from "@/lib/blocks/export-html";
import { designSystemCss } from "@/lib/design/design-system";
import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";
import { useDesignSystem } from "@/store/design-system";
import { resolveSaveMode, savePayload, saveUrl } from "./use-editor-persistence.helpers";
import { requestThumbnailCapture } from "@/lib/thumbnails/capture-controller";

/**
 * Save/publish/unpublish/export for whichever editor mode is active, plus the
 * debounced autosave and the unsaved-changes unload warning. Owns the hidden
 * export node's ref (attach the returned `exportRef` to the export <div>).
 */
export function useEditorPersistence(opts: {
  isSiteMode: boolean;
  isCollectionMode: boolean;
  isComponentMode: boolean;
  siteRegion?: "header" | "footer";
}) {
  const { isSiteMode, isCollectionMode, isComponentMode, siteRegion } = opts;
  const exportRef = useRef<HTMLDivElement>(null);
  const dirty = useEditor((s) => s.dirty);
  const tree = useEditor((s) => s.tree);
  const autosave = useEditorUI((s) => s.autosave);

  const save = useCallback(async () => {
    const s = useEditor.getState();
    const pageId = s.pageId;
    if (!pageId) return;
    s.setSaving(true);
    const started = Date.now();
    try {
      const mode = resolveSaveMode({ isSiteMode, isCollectionMode, isComponentMode });
      const url = saveUrl(mode, pageId);
      const payload = savePayload(
        mode,
        { pageId, title: s.title, tree: s.tree, seo: s.seo, theme: s.theme },
        siteRegion,
      );
      await api.put(url, payload);
      // keep the saving indicator visible long enough to read
      const elapsed = Date.now() - started;
      if (elapsed < 650) await new Promise((r) => setTimeout(r, 650 - elapsed));
      useEditor.getState().markSaved(Date.now());
    } catch {
      useEditor.getState().setSaving(false);
    }
  }, [isComponentMode, isSiteMode, isCollectionMode, siteRegion]);

  const publish = useCallback(async () => {
    await save();
    const s = useEditor.getState();
    if (!s.pageId) return;
    try {
      const data = (await api.post(endpoints.pages.publish(s.pageId), { published: true })).data;
      useEditor.getState().setPublished(!!data.published);
      // capture a restore point for each publish
      void api.post(endpoints.pages.versions(s.pageId), { label: "Published" }).catch(() => {});
      void requestThumbnailCapture({ force: true });
    } catch {
      /* ignore */
    }
  }, [save]);

  const unpublish = useCallback(async () => {
    const s = useEditor.getState();
    if (!s.pageId) return;
    try {
      const data = (await api.post(endpoints.pages.publish(s.pageId), { published: false })).data;
      useEditor.getState().setPublished(!!data.published);
    } catch {
      /* ignore */
    }
  }, []);

  const exportHtml = useCallback(() => {
    const s = useEditor.getState();
    const body = exportRef.current?.innerHTML ?? "";
    const ds = useDesignSystem.getState();
    const html = buildExportDocument(
      s.title,
      body,
      s.tree,
      designSystemCss(ds.colors, ds.textStyles),
    );
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.slug || "page"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  // warn on hard unload (refresh / close) with unsaved edits
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // debounced autosave (off by default; toggled from the editor navbar)
  useEffect(() => {
    if (!dirty || !autosave) return;
    const t = setTimeout(() => void save(), 1200);
    return () => clearTimeout(t);
  }, [dirty, autosave, tree, save]);

  const saveManual = useCallback(async () => {
    await save();
    void requestThumbnailCapture();
  }, [save]);

  return { save, saveManual, publish, unpublish, exportHtml, exportRef };
}
