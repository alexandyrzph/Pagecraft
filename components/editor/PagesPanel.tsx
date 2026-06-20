"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useEditor } from "@/store/editor-store";
import { useEditorActions } from "./editor-actions";

type PageRow = { id: string; title: string; slug: string; published: boolean };

export function PagesPanel() {
  const actions = useEditorActions();
  const currentId = useEditor((s) => s.pageId);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  function load() {
    api
      .get(endpoints.pages.list)
      .then((r) => r.data)
      .then((d) => setPages(Array.isArray(d) ? d : []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function create() {
    actions.confirmLeave(async () => {
      setCreating(true);
      try {
        const { data: p } = await api.post(endpoints.pages.list, {
          title: "Untitled Page",
          content: [],
        });
        await actions.loadPageInPlace(p.id);
        load();
      } finally {
        setCreating(false);
      }
    });
  }

  return (
    <div className="space-y-1">
      <button
        onClick={create}
        disabled={creating}
        className="mb-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
      >
        {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} New page
      </button>

      {loading ? (
        <div className="flex justify-center py-6 text-zinc-400">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : (
        pages.map((p) => (
          <button
            key={p.id}
            onClick={() => actions.switchPage(p.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
              p.id === currentId
                ? "bg-indigo-50 text-indigo-700"
                : "text-zinc-600 hover:bg-zinc-100",
            )}
          >
            <FileText size={14} className="shrink-0 opacity-70" />
            <span className="min-w-0 flex-1 truncate">{p.title}</span>
            {p.published && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
          </button>
        ))
      )}
    </div>
  );
}
