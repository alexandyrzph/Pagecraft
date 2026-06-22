import type { Editor } from "@tiptap/react";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { FrameInfo } from "./iframe-context";

export function getToolbarPosition(
  editor: Editor,
  frame: FrameInfo | null,
): { left: number; top: number } | null {
  let coords: { left: number; top: number } | null = null;
  try {
    const c = editor.view.coordsAtPos(editor.state.selection.from);
    const fb = frame?.el.getBoundingClientRect() ?? { left: 0, top: 0 };
    coords = { left: c.left + fb.left, top: c.top + fb.top };
  } catch {
    coords = null;
  }
  if (!coords) return null;

  const left = Math.max(8, Math.min(coords.left, window.innerWidth - 280));
  const top = Math.max(56, coords.top - 48);
  return { left, top };
}

export function setEditorLink(editor: Editor, url: string) {
  if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  else editor.chain().focus().extendMarkRange("link").unsetLink().run();
}

export async function runAiRewrite(
  editor: Editor,
  action: string,
  aiBusy: boolean,
  setAiBusy: (v: boolean) => void,
  setAiOpen: (v: boolean) => void,
) {
  const sel = editor.state.selection;
  const hasSel = !sel.empty;
  const text = hasSel ? editor.state.doc.textBetween(sel.from, sel.to, " ") : editor.getText();
  if (!text.trim() || aiBusy) return;
  setAiBusy(true);
  try {
    const d = (await api.post(endpoints.ai, { mode: "rewrite", action, text })).data;
    if (d.text) {
      if (hasSel) editor.chain().focus().insertContent(d.text).run();
      else editor.chain().focus().setContent(d.text).run();
    }
  } catch {
    /* ignore */
  } finally {
    setAiBusy(false);
    setAiOpen(false);
  }
}
