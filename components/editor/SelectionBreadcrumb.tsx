"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Clipboard, Copy, Layers, Trash2, X } from "lucide-react";
import { getDefinition } from "@/lib/blocks/registry";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/types";
import type { ComponentItem } from "./components-context";
import { crumbLabel, useSelectionBreadcrumbState } from "./SelectionBreadcrumb.helpers";

// Bottom-of-canvas selection HUD:
//  • one block selected  → ancestor breadcrumb (click a crumb to select it)
//  • many blocks selected → bulk-action bar (duplicate / paste styles / delete)
export function SelectionBreadcrumb() {
  const s = useSelectionBreadcrumbState();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <AnimatePresence mode="wait">
        {s.show && s.multi ? (
          <motion.div
            key="multi"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 480, damping: 32 }}
            role="toolbar"
            aria-label="Selection actions"
            className="pointer-events-auto flex items-center gap-1 rounded-full bg-zinc-900 py-1.5 pl-3 pr-1.5 text-white shadow-2xl ring-1 ring-black/10"
          >
            <span className="flex items-center gap-1.5 pr-1 text-[13px] font-semibold">
              <Layers size={14} className="text-indigo-300" />
              {s.selectedIds.length} selected
            </span>
            <BarBtn
              icon={<Clipboard size={14} />}
              label="Paste styles"
              onClick={() => s.pasteStyles(s.selectedId ?? s.selectedIds[0])}
            />
            <BarBtn icon={<Copy size={14} />} label="Duplicate" onClick={s.duplicateSelected} />
            <BarBtn icon={<Trash2 size={14} />} label="Delete" danger onClick={s.removeSelected} />
            <span className="mx-0.5 h-5 w-px bg-white/15" />
            <BarBtn icon={<X size={14} />} label="Clear" onClick={() => s.select(null)} />
          </motion.div>
        ) : s.show && s.path ? (
          <motion.nav
            key="crumb"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 480, damping: 32 }}
            aria-label="Selected element path"
            className="pointer-events-auto flex max-w-[80vw] items-center gap-0.5 overflow-x-auto rounded-full bg-white/95 px-2 py-1 text-[12px] shadow-xl ring-1 ring-black/5 backdrop-blur"
          >
            {s.path.map((b, i, arr) => (
              <Crumb
                key={b.id}
                block={b}
                componentsMap={s.componentsMap}
                first={i === 0}
                last={i === arr.length - 1}
                onSelect={s.select}
              />
            ))}
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Crumb({
  block,
  componentsMap,
  first,
  last,
  onSelect,
}: {
  block: Block;
  componentsMap: Record<string, ComponentItem>;
  first: boolean;
  last: boolean;
  onSelect: (id: string) => void;
}) {
  const def = getDefinition(block.type);
  const Icon = def?.icon;
  const label = crumbLabel(block, def, componentsMap);
  return (
    <span className="flex shrink-0 items-center">
      {!first && <ChevronRight size={13} className="mx-0.5 text-zinc-300" />}
      <button
        type="button"
        onClick={() => onSelect(block.id)}
        className={cn(
          "flex items-center gap-1 rounded-full px-2 py-1 font-medium transition-colors",
          last
            ? "bg-indigo-50 text-indigo-700"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800",
        )}
      >
        {Icon && <Icon size={12} />}
        {label}
      </button>
    </span>
  );
}

function BarBtn({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/15",
        danger && "hover:bg-red-500/20 hover:text-red-300",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}
