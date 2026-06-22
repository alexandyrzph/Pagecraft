"use client";

import {
  GripHorizontal,
  Maximize2,
  Move,
  Network,
  PanelBottom,
  StretchHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDefinition } from "@/lib/blocks/registry";
import { blockHtmlClass, blockHtmlId } from "@/lib/blocks/styles";
import type { Block } from "@/lib/types";
import { useEditor } from "@/store/editor-store";
import type { Dims, Mode } from "./DomTreePanel.helpers";

// Maps a block type to the HTML tag it renders as (its root element), so the
// panel reads like a real DOM/elements tree rather than the friendly labels the
// Layers panel already provides.
const TAGS: Record<string, string> = {
  section: "section",
  hero: "section",
  features: "section",
  pricing: "section",
  testimonial: "section",
  stats: "section",
  cta: "section",
  form: "form",
  collection: "section",
  footer: "footer",
  navbar: "nav",
  text: "div",
  button: "a",
  image: "img",
  icon: "div",
  video: "div",
  list: "ul",
  quote: "blockquote",
  columns: "div",
  column: "div",
  spacer: "div",
  divider: "div",
  file: "div",
  embed: "div",
  code: "div",
  component: "div",
};

function tagFor(block: Block): string {
  if (block.type === "heading") return String(block.props?.level ?? "h2");
  return TAGS[block.type] ?? "div";
}

function domNodeText(block: Block): string | undefined {
  return (block.props?.text || block.props?.title || block.props?.brand) as string | undefined;
}

function domNodeClassList(block: Block): string {
  // de-dupe classes so the same name typed twice doesn't render twice
  return [...new Set(blockHtmlClass(block).split(/\s+/).filter(Boolean))].join(" ");
}

function rowClassName(selected: boolean, hovered: boolean): string {
  return cn(
    "cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded py-[3px] pr-2 font-mono text-[12px] leading-5 transition-colors",
    selected ? "bg-indigo-100" : hovered ? "bg-zinc-100" : "hover:bg-zinc-100",
  );
}

function DomNodeRow({
  tag,
  htmlId,
  classList,
  hasDef,
  text,
  depth,
  selected,
  hovered,
  onSelect,
  onHoverEnter,
  onHoverLeave,
}: {
  tag: string;
  htmlId: string | undefined;
  classList: string;
  hasDef: boolean;
  text: string | undefined;
  depth: number;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      style={{ paddingLeft: 10 + depth * 14 }}
      className={rowClassName(selected, hovered)}
    >
      <span className="text-zinc-400">&lt;</span>
      <span className="text-rose-600">{tag}</span>
      {htmlId && (
        <>
          <span className="text-violet-600"> id</span>
          <span className="text-zinc-400">=</span>
          <span className="text-sky-700">&quot;{htmlId}&quot;</span>
        </>
      )}
      {classList && (
        <>
          <span className="text-violet-600"> class</span>
          <span className="text-zinc-400">=</span>
          <span className="text-sky-700">&quot;{classList}&quot;</span>
        </>
      )}
      <span className="mr-1 text-zinc-400">&gt;</span>
      {!hasDef && <span className="text-zinc-300">?</span>}
      {text && <span className="truncate text-zinc-400">{String(text).slice(0, 40)}</span>}
    </div>
  );
}

function DomNode({ block, depth }: { block: Block; depth: number }) {
  const def = getDefinition(block.type);
  const selectedId = useEditor((s) => s.selectedId);
  const hoveredId = useEditor((s) => s.hoveredId);
  const select = useEditor((s) => s.select);
  const hover = useEditor((s) => s.hover);

  return (
    <>
      <DomNodeRow
        tag={tagFor(block)}
        htmlId={blockHtmlId(block)}
        classList={domNodeClassList(block)}
        hasDef={!!def}
        text={domNodeText(block)}
        depth={depth}
        selected={selectedId === block.id}
        hovered={hoveredId === block.id}
        onSelect={() => select(block.id)}
        onHoverEnter={() => hover(block.id)}
        onHoverLeave={() => hover(null)}
      />
      {block.children.map((c) => (
        <DomNode key={c.id} block={c} depth={depth + 1} />
      ))}
    </>
  );
}

function ModeBtn({
  m,
  icon,
  title,
  active,
  onSelect,
}: {
  m: Mode;
  icon: React.ReactNode;
  title: string;
  active: boolean;
  onSelect: (m: Mode) => void;
}) {
  return (
    <button
      data-no-drag
      onClick={() => onSelect(m)}
      title={title}
      className={cn(
        "rounded-md p-1 transition-colors",
        active
          ? "bg-indigo-100 text-indigo-600"
          : "text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600",
      )}
    >
      {icon}
    </button>
  );
}

export function DomTreeHeader({
  float,
  count,
  mode,
  onHeaderDown,
  onSelectMode,
  onClose,
}: {
  float: boolean;
  count: number;
  mode: Mode;
  onHeaderDown: (e: React.PointerEvent) => void;
  onSelectMode: (m: Mode) => void;
  onClose: () => void;
}) {
  return (
    <div
      onPointerDown={onHeaderDown}
      className={cn(
        "flex h-9 shrink-0 select-none items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3",
        float ? "cursor-grab active:cursor-grabbing" : "cursor-grab",
      )}
    >
      <Network size={14} className="text-indigo-500" />
      <span className="text-xs font-bold tracking-tight text-zinc-700">DOM tree</span>
      <span className="rounded bg-zinc-200/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-zinc-500">
        {count} elements
      </span>
      {float && <GripHorizontal size={14} className="ml-1 text-zinc-300" />}
      <div className="ml-auto flex items-center gap-0.5">
        <ModeBtn
          m="dock"
          icon={<PanelBottom size={14} />}
          title="Dock to canvas"
          active={mode === "dock"}
          onSelect={onSelectMode}
        />
        <ModeBtn
          m="full"
          icon={<StretchHorizontal size={14} />}
          title="Full width"
          active={mode === "full"}
          onSelect={onSelectMode}
        />
        <ModeBtn
          m="float"
          icon={<Move size={14} />}
          title="Detach / float"
          active={mode === "float"}
          onSelect={onSelectMode}
        />
        <div className="mx-1 h-4 w-px bg-zinc-200" />
        <button
          data-no-drag
          onClick={onClose}
          title="Hide DOM tree"
          className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export function DomTreeBody({ tree }: { tree: Block[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto py-1.5">
      {tree.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-400">
          No elements yet — add a block to see the DOM tree.
        </p>
      ) : (
        tree.map((b) => <DomNode key={b.id} block={b} depth={0} />)
      )}
    </div>
  );
}

export function TopResizeHandle({
  onResizeDown,
}: {
  onResizeDown: (e: React.PointerEvent, dims: Dims) => void;
}) {
  return (
    <div
      onPointerDown={(e) => onResizeDown(e, "h-top")}
      className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize"
      title="Drag to resize"
    />
  );
}

export function FloatResizeHandles({
  onResizeDown,
}: {
  onResizeDown: (e: React.PointerEvent, dims: Dims) => void;
}) {
  return (
    <>
      <div
        onPointerDown={(e) => onResizeDown(e, "w")}
        className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize"
      />
      <div
        onPointerDown={(e) => onResizeDown(e, "h")}
        className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
      />
      <div
        onPointerDown={(e) => onResizeDown(e, "wh")}
        className="absolute bottom-0 right-0 flex h-3.5 w-3.5 cursor-nwse-resize items-end justify-end p-0.5"
        title="Resize"
      >
        <Maximize2 size={9} className="rotate-90 text-zinc-300" />
      </div>
    </>
  );
}
