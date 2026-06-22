"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { Modal } from "@/components/ui/Modal";
import type { Block } from "@/lib/types";
import { useShallow } from "zustand/react/shallow";
import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";
import {
  resolveInsertIndex,
  aiErrorMessage,
  NoProviderNotice,
  ScopeToggle,
  DesignStylePicker,
  ExamplePrompts,
  GenerateFooter,
} from "./AiGenerateModal.helpers";

// Effect body for when the modal opens: fetch the available providers and wire
// up Escape-to-close. Returns the listener cleanup (or nothing when closed).
function openAiModal(
  ai: unknown,
  close: () => void,
  setProviders: (v: string[]) => void,
  setProvider: (fn: (p: string) => string) => void,
): (() => void) | undefined {
  if (!ai) return;
  api
    .get(endpoints.ai)
    .then((r) => r.data)
    .then((d) => {
      const list: string[] = Array.isArray(d.providers) ? d.providers : [];
      setProviders(list);
      setProvider((p) => (list.includes(p) ? p : (list[0] ?? "")));
    })
    .catch(() => setProviders([]));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

// Store/state wiring, kept in one hook so the component stays a thin render plus
// the generate handler.
function useAiGenerateModalState() {
  const { ai, close } = useEditorUI(useShallow((s) => ({ ai: s.ai, close: s.closeAi })));
  const { insertTree, replaceTree } = useEditor(
    useShallow((s) => ({ insertTree: s.insertTree, replaceTree: s.replaceTree })),
  );

  const [providers, setProviders] = useState<string[] | null>(null);
  const [provider, setProvider] = useState("");
  const [prompt, setPrompt] = useState("");
  const [scope, setScope] = useState<"section" | "page">("section");
  const [style, setStyle] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [prevAi, setPrevAi] = useState(ai);

  useEffect(() => openAiModal(ai, close, setProviders, setProvider), [ai, close]);

  return {
    ai,
    close,
    insertTree,
    replaceTree,
    providers,
    provider,
    setProvider,
    prompt,
    setPrompt,
    scope,
    setScope,
    style,
    setStyle,
    busy,
    setBusy,
    error,
    setError,
    prevAi,
    setPrevAi,
  };
}

export function AiGenerateModal() {
  const {
    ai,
    close,
    insertTree,
    replaceTree,
    providers,
    provider,
    setProvider,
    prompt,
    setPrompt,
    scope,
    setScope,
    style,
    setStyle,
    busy,
    setBusy,
    error,
    setError,
    prevAi,
    setPrevAi,
  } = useAiGenerateModalState();

  if (ai !== prevAi) {
    setPrevAi(ai);
    if (ai) setError("");
  }

  const generate = async () => {
    if (!ai) return;
    const p = prompt.trim();
    if (!p || busy) return;
    setBusy(true);
    setError("");
    try {
      const d = (
        await api.post(endpoints.ai, {
          prompt: p,
          provider,
          style,
          mode: scope === "page" ? "page" : "generate",
        })
      ).data;
      const blocks = (d.blocks as Block[]) ?? [];
      if (scope === "page") {
        replaceTree(blocks);
      } else {
        const tree = useEditor.getState().tree;
        const index = resolveInsertIndex(tree, ai);
        blocks.forEach((blk, i) => insertTree(blk, ai.parentId, index + i));
      }
      close();
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const noProvider = providers !== null && providers.length === 0;

  return (
    <Modal open={!!ai} onClose={close} align="top" className="max-w-lg overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-[#e8eaed] bg-white px-5 py-3.5">
        <Sparkles size={18} className="text-indigo-600" />
        <div className="flex-1">
          <h2 className="text-sm font-bold tracking-tight text-[#111827]">Generate with AI</h2>
          <p className="text-[11px] text-zinc-500">
            Describe a section and AI will build it on your page.
          </p>
        </div>
        <button
          onClick={close}
          className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5">
        {noProvider ? (
          <NoProviderNotice />
        ) : (
          <>
            <ScopeToggle scope={scope} onChange={setScope} />
            <DesignStylePicker value={style} onChange={setStyle} />
            <textarea
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
              }}
              rows={3}
              placeholder="e.g. A hero section for an eco-friendly coffee brand with a Shop now button"
              className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-sm leading-relaxed text-zinc-800 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />

            <ExamplePrompts onPick={setPrompt} />

            {scope === "page" && (
              <p className="mt-2 text-[11px] text-amber-600">
                Generates a full page and replaces the current content (undoable, and saved to
                version history).
              </p>
            )}
            {error && <p className="mt-2.5 text-xs text-red-500">{error}</p>}

            <GenerateFooter
              providers={providers}
              provider={provider}
              onProviderChange={setProvider}
              busy={busy}
              prompt={prompt}
              onGenerate={generate}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
