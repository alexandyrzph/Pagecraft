"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, RotateCcw, Save, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useEditor } from "@/store/editor-store";

export type Version = { id: string; label: string; createdAt: string };

const DOT_COLORS: Record<string, string> = {
  Published: "bg-emerald-500",
  "Before restore": "bg-amber-400",
};

export function dotColor(label: string): string {
  return DOT_COLORS[label] ?? "bg-indigo-400";
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

function fetchVersions(pageId: string, setVersions: (v: Version[]) => void): Promise<void> {
  return api
    .get(endpoints.pages.versions(pageId))
    .then((r) => r.data)
    .then((d) => setVersions(d));
}

export type VersionHistoryState = {
  versions: Version[];
  loading: boolean;
  busy: string | null;
  snapshot: () => Promise<void>;
  restore: (v: Version) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export function useVersionHistoryState({
  open,
  onClose,
  pageId,
  save,
}: {
  open: boolean;
  onClose: () => void;
  pageId: string | null;
  save: () => Promise<void>;
}): VersionHistoryState {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const replaceTree = useEditor((s) => s.replaceTree);
  const setTheme = useEditor((s) => s.setTheme);

  const refresh = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const { data } = await api.get(endpoints.pages.versions(pageId));
      setVersions(data);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  const loadKey = open && pageId ? pageId : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  if (loadKey !== loadedKey) {
    setLoadedKey(loadKey);
    if (loadKey !== null) setLoading(true);
  }

  useEffect(() => {
    if (!open || !pageId) return;
    void fetchVersions(pageId, setVersions).finally(() => setLoading(false));
  }, [open, pageId]);

  const snapshot = async () => {
    if (!pageId) return;
    setBusy("save");
    try {
      await save(); // persist current edits so the snapshot is current
      await api.post(endpoints.pages.versions(pageId), { label: "Manual save" });
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const restore = async (v: Version) => {
    if (!pageId) return;
    setBusy(v.id);
    try {
      // snapshot the current state first so restore is always reversible
      await save();
      await api.post(endpoints.pages.versions(pageId), { label: "Before restore" });
      const snap = (await api.get(endpoints.pages.version(pageId, v.id))).data;
      replaceTree(snap.content);
      setTheme(snap.theme ?? {});
      await save();
      onClose();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!pageId) return;
    setBusy(id);
    try {
      await api.delete(endpoints.pages.version(pageId, id));
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  return { versions, loading, busy, snapshot, restore, remove };
}

export function VersionHistoryHeader({
  busy,
  onSnapshot,
  onClose,
}: {
  busy: string | null;
  onSnapshot: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-zinc-200 px-5 py-3.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
        <History size={16} />
      </div>
      <h2 className="flex-1 text-sm font-bold tracking-tight text-zinc-900">Version history</h2>
      <button
        onClick={onSnapshot}
        disabled={busy === "save"}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy === "save" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
        version
      </button>
      <button
        onClick={onClose}
        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function VersionRow({
  version,
  busy,
  onRestore,
  onRemove,
}: {
  version: Version;
  busy: string | null;
  onRestore: (v: Version) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-zinc-50">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor(version.label))} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-700">{version.label}</span>
        <span className="block text-[11px] text-zinc-400">{relativeTime(version.createdAt)}</span>
      </span>
      <button
        onClick={() => onRestore(version)}
        disabled={!!busy}
        title="Restore this version"
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 opacity-0 transition hover:bg-indigo-50 group-hover:opacity-100 disabled:opacity-40"
      >
        {busy === version.id ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <RotateCcw size={12} />
        )}{" "}
        Restore
      </button>
      <button
        onClick={() => onRemove(version.id)}
        disabled={!!busy}
        title="Delete version"
        className="rounded-md p-1 text-zinc-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export function VersionHistoryBody({
  loading,
  versions,
  busy,
  onRestore,
  onRemove,
}: {
  loading: boolean;
  versions: Version[];
  busy: string | null;
  onRestore: (v: Version) => void;
  onRemove: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pc-skeleton h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <p className="px-2 py-10 text-center text-sm text-zinc-400">
        No versions yet. Click <span className="font-medium text-zinc-500">Save version</span> to
        capture a restore point — one is also saved each time you publish.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {versions.map((v) => (
        <VersionRow key={v.id} version={v} busy={busy} onRestore={onRestore} onRemove={onRemove} />
      ))}
    </div>
  );
}
