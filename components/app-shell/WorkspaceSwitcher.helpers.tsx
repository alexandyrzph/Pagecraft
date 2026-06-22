"use client";

import axios from "axios";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export type WS = { id: string; name: string; slug: string; role: string };

export function workspaceInitials(name?: string) {
  return (name || "W").trim().slice(0, 2).toUpperCase();
}

export function createWorkspaceError(e: unknown): string {
  const d = (axios.isAxiosError(e) ? e.response?.data : null) ?? {};
  return d.error || "Could not create workspace";
}

export function WorkspaceTrigger({
  collapsed,
  name,
  initials,
  onToggle,
}: {
  collapsed: boolean;
  name?: string;
  initials: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      title={collapsed ? name : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[10px] border border-[#e8eaed] px-2 py-1.5 hover:bg-[#f7f8fa]",
        collapsed && "justify-center border-transparent px-1.5 hover:bg-[#f1f3f5]",
      )}
    >
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold tracking-[0.02em] text-white">
        {initials}
      </span>
      {!collapsed && (
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[13.5px] font-semibold leading-tight text-[#111827]">
            {name}
          </span>
          <span className="block font-mono text-[11px] text-[#9aa1ac]">Free plan</span>
        </span>
      )}
      {!collapsed && <ChevronsUpDown size={15} className="text-[#9aa1ac]" />}
    </button>
  );
}

export function WorkspaceListItem({
  ws,
  isActive,
  onSelect,
}: {
  ws: WS;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[#4b5563] hover:bg-[#f1f3f5]"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-[10px] font-bold text-white">
        {ws.name.slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{ws.name}</span>
      <span className="text-[10px] uppercase text-[#aeb4bd]">{ws.role}</span>
      {isActive && <Check size={14} className="text-indigo-600" />}
    </button>
  );
}

export function CreateWorkspaceForm({
  name,
  busy,
  err,
  onNameChange,
  onSubmit,
  onCancel,
}: {
  name: string;
  busy: boolean;
  err: string;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="Workspace name"
        className="w-full rounded-lg border border-[#d6dae0] px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
      />
      <div className="mt-1.5 flex gap-1.5">
        <Button variant="neutral" size="sm" className="flex-1" onPress={onSubmit} isLoading={busy}>
          Create
        </Button>
        <Button variant="ghost" size="sm" onPress={onCancel}>
          Cancel
        </Button>
      </div>
      {err && <p className="mt-1.5 text-xs text-red-600">{err}</p>}
    </div>
  );
}
