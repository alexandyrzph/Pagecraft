"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildCommands,
  filterCommands,
  focusInput,
  groupCommands,
  nextIndex,
  prevIndex,
  scrollActiveIntoView,
  type Command,
} from "./CommandPalette.helpers";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  onExport: () => void;
  onPublish: () => void;
};

type CommandPaletteState = {
  query: string;
  setQuery: (value: string) => void;
  active: number;
  setActive: (updater: (a: number) => number) => void;
  groups: [string, Command[]][];
  flat: Command[];
};

/** Reset query/active when the palette opens, and active when the query changes. */
function syncTransientState(
  opts: {
    open: boolean;
    wasOpen: boolean;
    query: string;
    prevQuery: string;
  },
  setWasOpen: (open: boolean) => void,
  setQuery: (value: string) => void,
  setActive: (value: number) => void,
  setPrevQuery: (value: string) => void,
): void {
  if (opts.open !== opts.wasOpen) {
    setWasOpen(opts.open);
    if (opts.open) {
      setQuery("");
      setActive(0);
    }
  }
  if (opts.query !== opts.prevQuery) {
    setPrevQuery(opts.query);
    setActive(0);
  }
}

function useCommandPaletteState(props: CommandPaletteProps): CommandPaletteState {
  const { open, onSave, onExport, onPublish } = props;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  const [prevQuery, setPrevQuery] = useState(query);

  const commands = useMemo<Command[]>(
    () => buildCommands({ onSave, onExport, onPublish, goHome: () => router.push("/") }),
    [onSave, onExport, onPublish, router],
  );
  const results = useMemo(() => filterCommands(commands, query), [commands, query]);
  const groups = useMemo(() => groupCommands(results), [results]);

  syncTransientState(
    { open, wasOpen, query, prevQuery },
    setWasOpen,
    setQuery,
    setActive,
    setPrevQuery,
  );

  return { query, setQuery, active, setActive, groups, flat: results };
}

export function CommandPalette(props: CommandPaletteProps) {
  const { open, onClose } = props;
  const { query, setQuery, active, setActive, groups, flat } = useCommandPaletteState(props);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    focusInput(inputRef.current);
  }, [open]);

  useEffect(() => {
    scrollActiveIntoView(listRef.current, active);
  }, [active]);

  if (!open) return null;

  const run = (c?: Command) => {
    if (!c) return;
    c.run();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => nextIndex(a, flat.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(prevIndex);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(flat[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
    e.stopPropagation();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-start justify-center bg-zinc-900/40 p-4 pt-[12vh] backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -8 }}
          transition={{ type: "spring", stiffness: 460, damping: 32 }}
          className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4">
            <Search size={18} className="shrink-0 text-zinc-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search blocks…"
              className="w-full bg-transparent py-3.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
              onKeyDown={onKeyDown}
            />
            <kbd className="hidden shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 sm:block">
              ESC
            </kbd>
          </div>

          <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
            {flat.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-zinc-400">No matching commands.</p>
            ) : (
              groups.map(([group, items]) => (
                <div key={group} className="mb-1">
                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {group}
                  </p>
                  {items.map((c) => {
                    const idx = flat.indexOf(c);
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        data-idx={idx}
                        onMouseMove={() => setActive(() => idx)}
                        onClick={() => run(c)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                          idx === active
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-zinc-700 hover:bg-zinc-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                            idx === active
                              ? "bg-white text-indigo-600 shadow-xs"
                              : "bg-zinc-100 text-zinc-500",
                          )}
                        >
                          <Icon size={14} />
                        </span>
                        <span className="flex-1 truncate">{c.label}</span>
                        {c.group === "Insert block" && idx === active && (
                          <Plus size={13} className="text-indigo-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-zinc-100 px-1 py-0.5 font-semibold">↑</kbd>
              <kbd className="rounded bg-zinc-100 px-1 py-0.5 font-semibold">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-zinc-100 px-1 py-0.5 font-semibold">↵</kbd>
              to run
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
