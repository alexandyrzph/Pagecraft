import {
  Copy,
  Download,
  Eye,
  LayoutDashboard,
  Monitor,
  Redo2,
  Rocket,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CATEGORIES, getDefinition } from "@/lib/blocks/registry";
import { useEditor } from "@/store/editor-store";

export type Command = {
  id: string;
  group: string;
  label: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
};

export type CommandActionHandlers = {
  onSave: () => void;
  onExport: () => void;
  onPublish: () => void;
  goHome: () => void;
};

/** Subsequence match — "hdg" matches "Heading". Returns a score or -1. */
export function score(query: string, text: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return 100 - t.indexOf(q);
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 1 : -1;
}

/** Insert-block commands, one per registered type in palette order. */
export function buildInsertCommands(): Command[] {
  return CATEGORIES.flatMap((cat) =>
    cat.types.flatMap((type) => {
      const def = getDefinition(type);
      if (!def) return [];
      return [
        {
          id: `insert:${type}`,
          group: "Insert block",
          label: `Add ${def.label}`,
          icon: def.icon,
          keywords: `${cat.name} ${def.description ?? ""}`,
          run: () => useEditor.getState().addBlock(type, null, useEditor.getState().tree.length),
        },
      ];
    }),
  );
}

/** Editor/view/page action commands. */
export function buildActionCommands(handlers: CommandActionHandlers): Command[] {
  const s = useEditor.getState();
  return [
    {
      id: "vp:desktop",
      group: "View",
      label: "Desktop view",
      icon: Monitor,
      run: () => s.setViewport("desktop"),
    },
    {
      id: "vp:tablet",
      group: "View",
      label: "Tablet view",
      icon: Tablet,
      run: () => s.setViewport("tablet"),
    },
    {
      id: "vp:mobile",
      group: "View",
      label: "Mobile view",
      icon: Smartphone,
      run: () => s.setViewport("mobile"),
    },
    {
      id: "preview",
      group: "View",
      label: "Toggle preview",
      icon: Eye,
      run: () => useEditor.getState().togglePreview(),
    },
    {
      id: "undo",
      group: "Edit",
      label: "Undo",
      icon: Undo2,
      run: () => useEditor.getState().undo(),
    },
    {
      id: "redo",
      group: "Edit",
      label: "Redo",
      icon: Redo2,
      run: () => useEditor.getState().redo(),
    },
    {
      id: "dup",
      group: "Edit",
      label: "Duplicate selected block",
      icon: Copy,
      run: () => {
        const id = useEditor.getState().selectedId;
        if (id) useEditor.getState().duplicate(id);
      },
    },
    {
      id: "del",
      group: "Edit",
      label: "Delete selected block",
      icon: Trash2,
      run: () => {
        const id = useEditor.getState().selectedId;
        if (id) useEditor.getState().remove(id);
      },
    },
    { id: "save", group: "Page", label: "Save page", icon: Save, run: handlers.onSave },
    { id: "publish", group: "Page", label: "Publish page", icon: Rocket, run: handlers.onPublish },
    {
      id: "export",
      group: "Page",
      label: "Export as HTML",
      icon: Download,
      run: handlers.onExport,
    },
    {
      id: "home",
      group: "Page",
      label: "Go to all pages",
      icon: LayoutDashboard,
      run: handlers.goHome,
    },
  ];
}

/** Full command list: actions first, then insert-block commands. */
export function buildCommands(handlers: CommandActionHandlers): Command[] {
  return [...buildActionCommands(handlers), ...buildInsertCommands()];
}

/** Rank + filter commands against the query (label, then keywords). */
export function filterCommands(commands: Command[], query: string): Command[] {
  if (!query) return commands;
  return commands
    .map((c) => ({ c, sc: Math.max(score(query, c.label), score(query, c.keywords ?? "") - 1) }))
    .filter((r) => r.sc >= 0)
    .sort((a, b) => b.sc - a.sc)
    .map((r) => r.c);
}

/** Group results preserving first-seen order. */
export function groupCommands(results: Command[]): [string, Command[]][] {
  const map = new Map<string, Command[]>();
  for (const c of results) {
    const arr = map.get(c.group);
    if (arr) arr.push(c);
    else map.set(c.group, [c]);
  }
  return Array.from(map.entries());
}

/** Clamp helpers for keyboard navigation. */
export function nextIndex(active: number, length: number): number {
  return Math.min(active + 1, length - 1);
}

export function prevIndex(active: number): number {
  return Math.max(active - 1, 0);
}

/** Focus the search input on the next frame. */
export function focusInput(el: HTMLInputElement | null): void {
  requestAnimationFrame(() => el?.focus());
}

/** Scroll the active row into view within the list. */
export function scrollActiveIntoView(listEl: HTMLDivElement | null, active: number): void {
  const el = listEl?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
  el?.scrollIntoView({ block: "nearest" });
}
