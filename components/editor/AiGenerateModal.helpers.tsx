"use client";

import axios from "axios";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { findBlockById } from "@/lib/blocks/tree";
import type { Block } from "@/lib/types";
import { DESIGN_STYLE_OPTIONS } from "@/lib/ai";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  mock: "Mock",
};

const EXAMPLES = [
  "A hero for a modern SaaS analytics product",
  "A pricing section with 3 tiers",
  "A features grid highlighting 3 benefits",
  "A testimonial from a happy customer",
  "A bold call-to-action to start a free trial",
];

export function resolveInsertIndex(
  tree: Block[],
  target: { parentId: string | null; index: number },
): number {
  if (target.index >= 0) return target.index;
  if (target.parentId) return findBlockById(tree, target.parentId)?.children.length ?? 0;
  return tree.length;
}

export function aiErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e) && e.response) {
    const d = e.response.data;
    return d.error || "Generation failed";
  }
  return "Network error — try again.";
}

export function NoProviderNotice() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-500">
      <p className="font-medium text-zinc-700">No AI provider configured</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
        Add <code className="rounded bg-zinc-200/70 px-1 text-[11px]">ANTHROPIC_API_KEY</code> or{" "}
        <code className="rounded bg-zinc-200/70 px-1 text-[11px]">OPENAI_API_KEY</code> to your{" "}
        <code className="rounded bg-zinc-200/70 px-1 text-[11px]">.env</code>, then restart.
      </p>
    </div>
  );
}

export function ScopeToggle({
  scope,
  onChange,
}: {
  scope: "section" | "page";
  onChange: (v: "section" | "page") => void;
}) {
  return (
    <div className="mb-3 flex gap-1 rounded-lg bg-zinc-100 p-1">
      {(
        [
          ["section", "Section"],
          ["page", "Full page"],
        ] as const
      ).map(([val, label]) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={cn(
            "flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors",
            scope === val
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function DesignStylePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Design style
      </p>
      <div className="flex flex-wrap gap-1.5">
        {DESIGN_STYLE_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              value === o.key
                ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-indigo-300 hover:text-indigo-600",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExamplePrompts({ onPick }: { onPick: (ex: string) => void }) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {EXAMPLES.map((ex) => (
        <button
          key={ex}
          onClick={() => onPick(ex)}
          className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
        >
          {ex}
        </button>
      ))}
    </div>
  );
}

export function GenerateFooter({
  providers,
  provider,
  onProviderChange,
  busy,
  prompt,
  onGenerate,
}: {
  providers: string[] | null;
  provider: string;
  onProviderChange: (v: string) => void;
  busy: boolean;
  prompt: string;
  onGenerate: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      {providers && providers.length > 1 ? (
        <label className="flex items-center gap-1.5 text-xs text-zinc-500">
          Model
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 outline-none"
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p] ?? p}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="text-[11px] text-zinc-400">⌘↵ to generate</span>
      )}
      <button
        onClick={onGenerate}
        disabled={!prompt.trim() || busy}
        className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-zinc-800 disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        {busy ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}
