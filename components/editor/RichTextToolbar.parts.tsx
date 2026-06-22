"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Sparkles,
  Strikethrough,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadAiAvailability } from "@/lib/ai-availability";
import { useRichText } from "@/store/richtext";
import { useIframe, type FrameInfo } from "./iframe-context";

export const AI_ACTIONS: { key: string; label: string }[] = [
  { key: "improve", label: "Improve writing" },
  { key: "shorten", label: "Make shorter" },
  { key: "expand", label: "Make longer" },
  { key: "grammar", label: "Fix spelling & grammar" },
  { key: "professional", label: "More professional" },
  { key: "casual", label: "More casual" },
];

export type RichTextToolbarState = {
  editor: Editor | null;
  frame: FrameInfo | null;
  linkOpen: boolean;
  setLinkOpen: React.Dispatch<React.SetStateAction<boolean>>;
  linkUrl: string;
  setLinkUrl: React.Dispatch<React.SetStateAction<string>>;
  hasAi: boolean;
  aiOpen: boolean;
  setAiOpen: React.Dispatch<React.SetStateAction<boolean>>;
  aiBusy: boolean;
  setAiBusy: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useRichTextToolbarState(): RichTextToolbarState {
  const editor = useRichText((s) => s.editor);
  const tick = useRichText((s) => s.tick);
  const { frame } = useIframe();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [hasAi, setHasAi] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  void tick;

  useEffect(() => loadAiAvailability(setHasAi), []);

  return {
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
  };
}

export function FormatButtons({ editor, run }: { editor: Editor; run: (fn: () => void) => void }) {
  return (
    <>
      <TBtn
        active={editor.isActive("bold")}
        onClick={() => run(() => editor.chain().focus().toggleBold().run())}
        title="Bold (⌘B)"
      >
        <Bold size={14} />
      </TBtn>
      <TBtn
        active={editor.isActive("italic")}
        onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
        title="Italic (⌘I)"
      >
        <Italic size={14} />
      </TBtn>
      <TBtn
        active={editor.isActive("strike")}
        onClick={() => run(() => editor.chain().focus().toggleStrike().run())}
        title="Strikethrough"
      >
        <Strikethrough size={14} />
      </TBtn>
      <Sep />
      <TBtn
        active={editor.isActive("bulletList")}
        onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}
        title="Bullet list"
      >
        <List size={14} />
      </TBtn>
      <TBtn
        active={editor.isActive("orderedList")}
        onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}
        title="Numbered list"
      >
        <ListOrdered size={14} />
      </TBtn>
    </>
  );
}

export function LinkControls({
  editor,
  run,
  linkOpen,
  setLinkOpen,
  linkUrl,
  setLinkUrl,
  applyLink,
}: {
  editor: Editor;
  run: (fn: () => void) => void;
  linkOpen: boolean;
  setLinkOpen: React.Dispatch<React.SetStateAction<boolean>>;
  linkUrl: string;
  setLinkUrl: React.Dispatch<React.SetStateAction<string>>;
  applyLink: () => void;
}) {
  return (
    <>
      {editor.isActive("link") ? (
        <TBtn
          active
          onClick={() => run(() => editor.chain().focus().unsetLink().run())}
          title="Remove link"
        >
          <Unlink size={14} />
        </TBtn>
      ) : (
        <TBtn
          active={linkOpen}
          onClick={() => {
            setLinkUrl("");
            setLinkOpen((o) => !o);
          }}
          title="Add link"
        >
          <Link2 size={14} />
        </TBtn>
      )}
      {linkOpen && (
        <input
          autoFocus
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyLink();
            if (e.key === "Escape") setLinkOpen(false);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="https://…"
          className="ml-1 w-40 rounded-md bg-zinc-800 px-2 py-1 text-xs text-white outline-none ring-1 ring-zinc-700 placeholder:text-zinc-500 focus:ring-indigo-400"
        />
      )}
    </>
  );
}

export function AiMenu({
  aiOpen,
  setAiOpen,
  aiBusy,
  aiRewrite,
}: {
  aiOpen: boolean;
  setAiOpen: React.Dispatch<React.SetStateAction<boolean>>;
  aiBusy: boolean;
  aiRewrite: (action: string) => void;
}) {
  return (
    <>
      <Sep />
      <div className="relative">
        <button
          title="Improve with AI"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setAiOpen((o) => !o)}
          className={cn(
            "flex h-7 items-center gap-1 rounded-lg px-1.5 text-[12px] font-semibold transition-colors",
            aiOpen ? "bg-indigo-600 text-white" : "text-indigo-600 hover:bg-indigo-50",
          )}
        >
          {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} AI
        </button>
        {aiOpen && (
          <div
            className="absolute left-0 top-9 z-10 w-44 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl"
            onMouseDown={(e) => e.preventDefault()}
          >
            {AI_ACTIONS.map((a) => (
              <button
                key={a.key}
                disabled={aiBusy}
                onClick={() => aiRewrite(a.key)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
              >
                <Sparkles size={12} className="text-indigo-400" /> {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function TBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
        active ? "bg-indigo-500 text-white" : "text-zinc-300 hover:bg-zinc-700 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

export function Sep() {
  return <span className="mx-0.5 h-4 w-px bg-zinc-700" />;
}
