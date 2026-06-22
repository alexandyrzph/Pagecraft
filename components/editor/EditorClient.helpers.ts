"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useEditor } from "@/store/editor-store";
import { useDragDropManager } from "./use-drag-drop";
import { useEditorData } from "./use-editor-data";
import { useEditorPersistence } from "./use-editor-persistence";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { usePageNavigation } from "./use-page-navigation";
import type { FrameInfo } from "./iframe-context";
import type { PageDTO } from "./EditorClient";

/** Initial editor-store payload derived from the server-rendered page. */
export function buildInitPayload(page: PageDTO) {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    published: page.published,
    tree: page.content,
    seo: page.seo,
    theme: page.theme,
  };
}

/** Schedules the brief readiness gate; returns its cleanup. */
export function scheduleReady(setReady: Dispatch<SetStateAction<boolean>>) {
  const t = setTimeout(() => setReady(true), 550);
  return () => clearTimeout(t);
}

type Mode = "page" | "component" | "site" | "collection";

/**
 * Every hook EditorClient needs, collapsed into one call so the component sits at
 * a flat hook-density. The mutated `frameRef` stays in the component (react-compiler
 * forbids mutating a ref returned from a custom hook) and is threaded in here.
 */
type EditorClientOpts = {
  page: PageDTO;
  mode: Mode;
  siteRegion?: "header" | "footer";
  frameRef: RefObject<FrameInfo | null>;
};

function useEditorClientFrame(frameRef: RefObject<FrameInfo | null>) {
  const [frame, setFrame] = useState<FrameInfo | null>(null);
  const [frameTick, setFrameTick] = useState(0);
  const registerFrame = useCallback(
    (f: FrameInfo | null) => {
      frameRef.current = f;
      setFrame(f);
    },
    [frameRef],
  );
  const bumpFrame = useCallback(() => setFrameTick((t) => t + 1), []);
  const iframeCtx = useMemo(
    () => ({ frame, tick: frameTick, register: registerFrame, bump: bumpFrame }),
    [frame, frameTick, registerFrame, bumpFrame],
  );
  const dragDrop = useDragDropManager(frameRef);
  return { frame, iframeCtx, dragDrop };
}

function useEditorClientCore(opts: EditorClientOpts, frame: FrameInfo | null) {
  const { page, mode, siteRegion } = opts;
  const isComponentMode = mode === "component";
  const isSiteMode = mode === "site";
  const isCollectionMode = mode === "collection";

  const init = useEditor((s) => s.init);
  const tree = useEditor((s) => s.tree);
  const [ready, setReady] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const editorData = useEditorData(mode);

  useEffect(() => {
    init(buildInitPayload(page));
  }, [page.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => scheduleReady(setReady), []);

  const persistence = useEditorPersistence({
    isSiteMode,
    isCollectionMode,
    isComponentMode,
    siteRegion,
  });
  const navigation = usePageNavigation({ refreshComponents: editorData.refreshComponents });
  const togglePalette = useCallback(() => setPaletteOpen((o) => !o), []);
  useKeyboardShortcuts({ save: persistence.save, togglePalette, frame });

  return {
    mode,
    ready,
    paletteOpen,
    setPaletteOpen,
    historyOpen,
    setHistoryOpen,
    tree,
    editorData,
    persistence,
    navigation,
  };
}

export function useEditorClientState(opts: EditorClientOpts) {
  const frameState = useEditorClientFrame(opts.frameRef);
  const core = useEditorClientCore(opts, frameState.frame);
  return { iframeCtx: frameState.iframeCtx, dragDrop: frameState.dragDrop, ...core };
}
