"use client";

import { useRouter } from "next/navigation";
import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";
import { useEditorActions } from "./editor-actions";

export type TopBarMode = "page" | "component" | "site" | "collection";

export function isComponentMode(mode: TopBarMode): boolean {
  return mode === "component" || mode === "site" || mode === "collection";
}

export type TopBarState = {
  previewMode: boolean;
  togglePreview: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  published: boolean;
  slug: string;
  saving: boolean;
  domTree: boolean;
  toggleDomTree: () => void;
  autosave: boolean;
  toggleAutosave: () => void;
  goHome: () => void;
};

export function useTopBarState(): TopBarState {
  const previewMode = useEditor((s) => s.previewMode);
  const togglePreview = useEditor((s) => s.togglePreview);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const past = useEditor((s) => s.past.length);
  const future = useEditor((s) => s.future.length);
  const published = useEditor((s) => s.published);
  const slug = useEditor((s) => s.slug);
  const saving = useEditor((s) => s.saving);
  const domTree = useEditorUI((s) => s.domTree);
  const toggleDomTree = useEditorUI((s) => s.toggleDomTree);
  const autosave = useEditorUI((s) => s.autosave);
  const toggleAutosave = useEditorUI((s) => s.toggleAutosave);
  const router = useRouter();
  const { confirmLeave } = useEditorActions();

  return {
    previewMode,
    togglePreview,
    undo,
    redo,
    canUndo: past > 0,
    canRedo: future > 0,
    published,
    slug,
    saving,
    domTree,
    toggleDomTree,
    autosave,
    toggleAutosave,
    goHome: () => confirmLeave(() => router.push("/")),
  };
}
