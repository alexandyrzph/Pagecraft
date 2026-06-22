"use client";

import { motion } from "framer-motion";
import {
  Component as ComponentIcon,
  Copy,
  GripVertical,
  PanelRight,
  Trash2,
  X,
} from "lucide-react";
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Block, SettingField, StyleGroup, Viewport } from "@/lib/types";
import { StyleGroupView } from "./style-fields";
import {
  AttributesControl,
  ContentField,
  MotionSection,
  StyleActions,
  TextStyleControl,
  VisibilityControl,
  VP,
} from "./block-controls";

export type InspectorTab = "content" | "style";

const INSPECTOR_TABS: readonly InspectorTab[] = ["content", "style"] as const;

// Header row: drag handle + per-block action buttons.
export function InspectorHeader({
  block,
  label,
  Icon,
  dragging,
  docked,
  onHandlePointerDown,
  onSaveAsComponent,
  onDuplicate,
  onRemove,
  onToggleDock,
  onClose,
}: {
  block: Block;
  label: string;
  Icon: LucideIcon;
  dragging?: boolean;
  docked?: boolean;
  onHandlePointerDown?: (e: React.PointerEvent) => void;
  onSaveAsComponent: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onToggleDock?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-zinc-200 py-2 pl-2 pr-2">
      <div
        onPointerDown={onHandlePointerDown}
        className={cn(
          "flex flex-1 select-none items-center gap-2 rounded-lg py-0.5 pl-1 pr-2",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        title="Drag to move panel"
      >
        <span className="flex items-center text-zinc-300">
          <GripVertical size={14} />
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon size={15} />
        </div>
        <span className="flex-1 truncate text-sm font-semibold tracking-tight text-zinc-800">
          {label}
        </span>
      </div>
      {block.type !== "component" && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
          title="Save as component"
          onClick={onSaveAsComponent}
        >
          <ComponentIcon size={14} />
        </motion.button>
      )}
      <motion.button
        whileTap={{ scale: 0.85 }}
        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        title="Duplicate"
        onClick={onDuplicate}
      >
        <Copy size={14} />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.85 }}
        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
        title="Delete"
        onClick={onRemove}
      >
        <Trash2 size={14} />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.85 }}
        className={cn(
          "rounded-lg p-1.5 transition-colors hover:bg-zinc-100",
          docked ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-600",
        )}
        title={docked ? "Float panel" : "Dock to right"}
        onClick={onToggleDock}
      >
        <PanelRight size={14} />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.85 }}
        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        title="Close"
        onClick={onClose}
      >
        <X size={14} />
      </motion.button>
    </div>
  );
}

// Content / Style tab switcher.
export function InspectorTabs({
  tab,
  onSelect,
}: {
  tab: InspectorTab;
  onSelect: (t: InspectorTab) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1 border-b border-zinc-200 p-2">
      {INSPECTOR_TABS.map((t) => (
        <button
          key={t}
          onClick={() => onSelect(t)}
          className={cn(
            "flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-colors",
            tab === t ? "bg-indigo-50 text-indigo-600" : "text-zinc-500 hover:text-zinc-700",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// Body of the Content tab: custom inspector, fields, or empty hint + attributes.
export function ContentTabPanel({
  block,
  fields,
  Custom,
}: {
  block: Block;
  fields: SettingField[];
  Custom?: ComponentType<{ block: Block }>;
}) {
  return (
    <>
      {Custom ? (
        <Custom block={block} />
      ) : fields.length === 0 ? (
        <p className="text-sm text-zinc-400">
          This block has no content options — use Attributes below or the Style tab.
        </p>
      ) : (
        fields.map((f) => (
          <ContentField key={f.key} field={f} blockId={block.id} value={block.props[f.key]} />
        ))
      )}
      <AttributesControl block={block} />
    </>
  );
}

// The viewport (breakpoint) picker shown at the top of the Style tab.
function ViewportPicker({
  viewport,
  onSelect,
}: {
  viewport: Viewport;
  onSelect: (id: Viewport) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-medium text-zinc-500">Editing viewport</span>
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
        {VP.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium capitalize transition-colors",
              viewport === v.id
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            {v.icon}
            {v.id}
          </button>
        ))}
      </div>
      {viewport !== "desktop" && (
        <p className="mt-1.5 text-[11px] leading-snug text-zinc-400">
          Overrides the desktop value on {viewport} and below.
        </p>
      )}
    </div>
  );
}

// Body of the Style tab: viewport picker, shared style controls, style groups.
export function StyleTabPanel({
  block,
  viewport,
  styleGroups,
  onSelectViewport,
}: {
  block: Block;
  viewport: Viewport;
  styleGroups: StyleGroup[];
  onSelectViewport: (id: Viewport) => void;
}) {
  return (
    <>
      <ViewportPicker viewport={viewport} onSelect={onSelectViewport} />
      <TextStyleControl block={block} />
      <StyleActions block={block} />
      <VisibilityControl block={block} />
      {styleGroups.map((g) => (
        <StyleGroupView key={g} group={g} />
      ))}
      <MotionSection block={block} />
    </>
  );
}
