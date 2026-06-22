"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/dialog-provider";
import { cn } from "@/lib/utils";
import { TEMPLATES, type Template } from "@/lib/blocks/templates";
import { type DashboardFilter } from "@/lib/dashboard/filter";
import { TemplatePreview } from "./TemplatePreview";
import { type DashboardPage } from "./PageCard";

export type PageItem = DashboardPage;

export type DashboardCounts = { all: number; live: number; drafts: number };

export const AI_EXAMPLES = [
  "A landing page for a SaaS analytics tool",
  "A portfolio for a freelance designer",
  "A page for an eco-friendly coffee brand",
  "A launch page for a productivity app",
];

// Number of published / draft pages, plus the total, for the segmented filter.
export function computeCounts(pages: PageItem[]): DashboardCounts {
  const live = pages.filter((p) => p.published).length;
  return { all: pages.length, live, drafts: pages.length - live };
}

// First block-supplied title, falling back to the prompt, clamped to 60 chars.
export function pickGeneratedTitle(
  blocks: { props?: { title?: string } }[],
  prompt: string,
): string {
  const titled = blocks.find((b) => b?.props?.title)?.props?.title;
  return (titled || prompt).toString().slice(0, 60);
}

// Generate a full page draft from a prompt, returning the new page id (or null).
export async function generatePage(prompt: string): Promise<string | null> {
  let blocks: { props?: { title?: string } }[];
  try {
    const d = (await api.post(endpoints.ai, { mode: "page", prompt })).data;
    blocks = d.blocks ?? [];
  } catch (e) {
    const d = (axios.isAxiosError(e) ? e.response?.data : null) ?? {};
    throw new Error(d.error || "Generation failed");
  }
  const title = pickGeneratedTitle(blocks, prompt);
  const page = (await api.post(endpoints.pages.list, { title, content: blocks })).data;
  return page.id ?? null;
}

// Create a page from a template and navigate into the editor; clears the
// "creating" flag if the request fails.
export async function runCreate(
  template: Template,
  setCreating: (id: string | null) => void,
  push: (href: string) => void,
): Promise<void> {
  setCreating(template.id);
  try {
    const page = (
      await api.post(endpoints.pages.list, {
        title: template.id === "blank" ? "Untitled Page" : `${template.name}`,
        content: template.build(),
      })
    ).data;
    push(`/editor/${page.id}`);
  } catch {
    setCreating(null);
  }
}

type ConfirmFn = (options: {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}) => Promise<boolean>;

// Confirm + delete a page, then refresh the list; toggles the "deleting" flag.
export async function runRemove(
  id: string,
  confirm: ConfirmFn,
  setDeleting: (id: string | null) => void,
  refresh: () => void,
): Promise<void> {
  const ok = await confirm({
    title: "Delete page?",
    message: "This page will be permanently deleted. This cannot be undone.",
    confirmLabel: "Delete",
    destructive: true,
  });
  if (!ok) return;
  setDeleting(id);
  try {
    await api.delete(endpoints.pages.byId(id));
    refresh();
  } finally {
    setDeleting(null);
  }
}

// Effect bodies, kept out of the hook so it stays hook-calls-only.
export function gateReady(setReady: (v: boolean) => void): () => void {
  const t = setTimeout(() => setReady(true), 500);
  return () => clearTimeout(t);
}

export function loadAiProviders(setHasAi: (v: boolean) => void): void {
  api
    .get(endpoints.ai)
    .then((r) => r.data)
    .then((d) => setHasAi(Array.isArray(d.providers) && d.providers.length > 0))
    .catch(() => {});
}

export function clearNewParam(
  searchParams: ReturnType<typeof useSearchParams>,
  router: ReturnType<typeof useRouter>,
): void {
  if (searchParams.get("new") === "1") router.replace("/");
}

// All of the Dashboard's hooks, so the component sits at ~1 hook-density.
function useDashboardChrome() {
  const router = useRouter();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [hasAi, setHasAi] = useState(false);
  useEffect(() => gateReady(setReady), []);
  useEffect(() => loadAiProviders(setHasAi), []);
  useEffect(() => clearNewParam(searchParams, router), [searchParams, router]);
  return { router, confirm, searchParams, ready, hasAi };
}

function useDashboardLocalState(pages: PageItem[]) {
  const [modal, setModal] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const [inbox, setInbox] = useState<{ id: string; title: string } | null>(null);
  const [aiModal, setAiModal] = useState(false);
  const [seenNewParam, setSeenNewParam] = useState<string | null | undefined>(undefined);
  const counts = useMemo(() => computeCounts(pages), [pages]);
  return {
    modal,
    setModal,
    creating,
    setCreating,
    deleting,
    setDeleting,
    query,
    setQuery,
    filter,
    setFilter,
    inbox,
    setInbox,
    aiModal,
    setAiModal,
    seenNewParam,
    setSeenNewParam,
    counts,
  };
}

export function useDashboardState(pages: PageItem[]) {
  const chrome = useDashboardChrome();
  const local = useDashboardLocalState(pages);
  return { ...chrome, ...local };
}

export function AiPageModal({
  open,
  onClose,
  onGenerate,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<string | null>;
  onDone: (id: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    const p = prompt.trim();
    if (!p || busy) return;
    setBusy(true);
    setError("");
    try {
      const id = await onGenerate(p);
      if (id) onDone(id);
      else setError("Could not create the page.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      align="top"
      dismissible={!busy}
      className="max-w-lg overflow-hidden"
    >
      <div className="flex items-center gap-2.5 border-b border-[#e8eaed] bg-white px-5 py-3.5">
        <Sparkles size={18} className="text-indigo-600" />
        <div className="flex-1">
          <h2 className="text-sm font-bold tracking-tight text-[#111827]">
            Generate a page with AI
          </h2>
          <p className="text-[11px] text-zinc-500">
            Describe your page — AI builds a full draft you can edit.
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close" onPress={() => !busy && onClose()}>
          <X size={18} />
        </Button>
      </div>
      <div className="p-5">
        <textarea
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
          }}
          rows={3}
          placeholder="e.g. A landing page for a meal-planning app with pricing and testimonials"
          className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-sm leading-relaxed text-zinc-800 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {AI_EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
            >
              {ex}
            </button>
          ))}
        </div>
        {error && <p className="mt-2.5 text-xs text-red-500">{error}</p>}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">⌘↵ to generate</span>
          <Button
            variant="neutral"
            onPress={run}
            isDisabled={!prompt.trim()}
            isLoading={busy}
            leadingIcon={<Sparkles size={15} />}
          >
            {busy ? "Generating page…" : "Generate page"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-20 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
        <Sparkles size={26} />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-zinc-900">Create your first page</h3>
      <p className="mb-5 mt-1 max-w-sm text-sm text-zinc-500">
        Start from a template or a blank canvas, then drag in blocks to build something beautiful.
      </p>
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={onCreate}
        className="flex items-center gap-1.5 rounded-xl bg-fg px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-fg/90"
      >
        <Plus size={16} /> New page
      </motion.button>
    </motion.div>
  );
}

export function TemplateModal({
  open,
  creating,
  onClose,
  onPick,
}: {
  open: boolean;
  creating: string | null;
  onClose: () => void;
  onPick: (t: Template) => void;
}) {
  // Build each template's block tree once (build() mints fresh ids each call).
  const built = useMemo(() => TEMPLATES.map((t) => ({ template: t, blocks: t.build() })), []);

  return (
    <Modal open={open} onClose={onClose} dismissible={!creating} className="max-w-3xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">
            Choose a starting point
          </h2>
          <p className="text-sm text-zinc-500">Pick a template or start from scratch.</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close" onPress={onClose}>
          <X size={18} />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {built.map(({ template: t, blocks }) => (
          <motion.div
            key={t.id}
            whileHover={creating ? undefined : { y: -2 }}
            whileTap={creating ? undefined : { scale: 0.98 }}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 text-left shadow-xs transition-colors hover:border-indigo-300",
              creating && "pointer-events-none opacity-60",
            )}
          >
            <TemplatePreview blocks={blocks} />
            <div className="flex flex-col gap-1 p-4 transition-colors group-hover:bg-indigo-50/40">
              <span className="font-semibold tracking-tight text-zinc-900 group-hover:text-indigo-700">
                {t.name}
              </span>
              <span className="text-xs leading-snug text-zinc-500">{t.description}</span>
            </div>
            <button
              type="button"
              aria-label={`Use ${t.name} template`}
              disabled={!!creating}
              onClick={() => onPick(t)}
              className="absolute inset-0 rounded-xl outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-400 disabled:cursor-not-allowed"
            />
            {creating === t.id && (
              <span className="absolute right-3 top-3">
                <Loader2 size={16} className="animate-spin text-indigo-500" />
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </Modal>
  );
}
