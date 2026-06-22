"use client";

import { useEffect } from "react";
import { findBlockById, locate } from "@/lib/blocks/tree";
import type { Block } from "@/lib/types";
import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";
import { useEditorActions } from "./editor-actions";

export const MENU_W = 210;

export type CtxTarget = { x: number; y: number; blockId: string };

export type ContextMenuView = {
  block: Block;
  loc: { parentId: string | null; index: number };
  isComponent: boolean;
  siblingCount: number;
  x: number;
  y: number;
};

// Resolve the menu's target block + placement from the raw tree and click point.
// Returns null when the targeted block no longer exists (it was deleted, etc.).
export function deriveContextMenuView(
  tree: Block[],
  ctx: CtxTarget,
  viewportW: number,
  viewportH: number,
): ContextMenuView | null {
  const block = findBlockById(tree, ctx.blockId);
  const loc = locate(tree, ctx.blockId);
  if (!block || !loc) return null;

  const siblingCount = loc.parentId
    ? (findBlockById(tree, loc.parentId)?.children.length ?? 0)
    : tree.length;

  return {
    block,
    loc,
    isComponent: block.type === "component",
    siblingCount,
    x: Math.min(ctx.x, viewportW - MENU_W - 8),
    y: Math.min(ctx.y, viewportH - 340),
  };
}

// Effect body, hoisted out of the hook so `useContextMenuState` stays a flat
// list of hook calls. Closes the menu on Escape or any scroll.
export function bindCloseListeners(
  ctx: CtxTarget | null,
  closeCtx: () => void,
): undefined | (() => void) {
  if (!ctx) return undefined;
  const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCtx();
  const onScroll = () => closeCtx();
  window.addEventListener("keydown", onKey);
  window.addEventListener("scroll", onScroll, true);
  return () => {
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("scroll", onScroll, true);
  };
}

export type ContextMenuState = {
  ctx: CtxTarget | null;
  closeCtx: () => void;
  openInserter: ReturnType<typeof useEditorUI.getState>["openInserter"];
  saveAsComponent: ReturnType<typeof useEditorActions>["saveAsComponent"];
  duplicate: (id: string) => void;
  copy: (id: string) => void;
  cut: (id: string) => void;
  paste: (afterId: string | null) => void;
  copyStyles: (id: string) => void;
  pasteStyles: (id: string) => void;
  remove: (id: string) => void;
  moveRelative: (id: string, dir: -1 | 1) => void;
};

// All of the component's hooks live here so the component itself sits at a
// single hook-density. Kept free of inline conditionals: the lone effect's
// body is delegated to `bindCloseListeners`.
export function useContextMenuState(): ContextMenuState {
  const ctx = useEditorUI((s) => s.ctx);
  const closeCtx = useEditorUI((s) => s.closeCtx);
  const openInserter = useEditorUI((s) => s.openInserter);
  const { saveAsComponent } = useEditorActions();
  const duplicate = useEditor((s) => s.duplicate);
  const copy = useEditor((s) => s.copy);
  const cut = useEditor((s) => s.cut);
  const paste = useEditor((s) => s.paste);
  const copyStyles = useEditor((s) => s.copyStyles);
  const pasteStyles = useEditor((s) => s.pasteStyles);
  const remove = useEditor((s) => s.remove);
  const moveRelative = useEditor((s) => s.moveRelative);

  useEffect(() => bindCloseListeners(ctx, closeCtx), [ctx, closeCtx]);

  return {
    ctx,
    closeCtx,
    openInserter,
    saveAsComponent,
    duplicate,
    copy,
    cut,
    paste,
    copyStyles,
    pasteStyles,
    remove,
    moveRelative,
  };
}
