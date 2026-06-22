"use client";

import { motion } from "framer-motion";
import { getToolbarPosition, runAiRewrite, setEditorLink } from "./RichTextToolbar.helpers";
import {
  AiMenu,
  FormatButtons,
  LinkControls,
  Sep,
  useRichTextToolbarState,
} from "./RichTextToolbar.parts";

export function RichTextToolbar() {
  const {
    editor,
    frame,
    linkOpen,
    setLinkOpen,
    linkUrl,
    setLinkUrl,
    hasAi,
    aiOpen,
    setAiOpen,
    aiBusy,
    setAiBusy,
  } = useRichTextToolbarState();

  if (!editor || (!editor.isFocused && !linkOpen && !aiOpen)) return null;

  const position = getToolbarPosition(editor, frame);
  if (!position) return null;
  const { left, top } = position;

  const run = (fn: () => void) => fn();
  const applyLink = () => {
    setEditorLink(editor, linkUrl.trim());
    setLinkOpen(false);
    setLinkUrl("");
  };

  const aiRewrite = (action: string) => runAiRewrite(editor, action, aiBusy, setAiBusy, setAiOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed z-[62] flex items-center gap-0.5 rounded-xl border border-zinc-700 bg-zinc-900 p-1 text-white shadow-2xl"
      style={{ left, top }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <FormatButtons editor={editor} run={run} />
      <Sep />
      <LinkControls
        editor={editor}
        run={run}
        linkOpen={linkOpen}
        setLinkOpen={setLinkOpen}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        applyLink={applyLink}
      />
      {hasAi && (
        <AiMenu aiOpen={aiOpen} setAiOpen={setAiOpen} aiBusy={aiBusy} aiRewrite={aiRewrite} />
      )}
    </motion.div>
  );
}
