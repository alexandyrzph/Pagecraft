"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import {
  Component as ComponentIcon,
  Copy,
  GripVertical,
  Pencil,
  Trash2,
  Unlink,
} from "lucide-react";
import type { Block } from "@/lib/types";
import { getDefinition } from "@/lib/blocks/registry";
import { findBlockById } from "@/lib/blocks/tree";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editor-store";
import { useShallow } from "zustand/react/shallow";
import { useRichText } from "@/store/richtext";
import { useCanvasZoom } from "@/store/canvas-zoom";
import { useIframe, type FrameInfo } from "./iframe-context";
import { useComponents, type ComponentItem } from "./components-context";
import { useEditorActions } from "./editor-actions";
import { useDrag } from "./drag-context";
import {
  blockChromeLabel,
  captureBaseScroll,
  computeBlockChromeRect,
  outlineClass,
  overlayHasChrome,
  shouldShowHover,
  startOverlaySync,
  toolbarBgClass,
} from "./CanvasOverlay.helpers";

// Top-document layer drawn over the iframe: selection/hover outline + the block
// toolbar and drag handle. Positioned with the block's iframe-relative rect
// inside a container aligned to the iframe, so coords line up without offset.
// All the store/ref/effect wiring the overlay needs, kept in one hook so the
// component body stays a thin render. The frame-perfect sync runs a rAF loop
// (started in an effect) that positions the overlay BEFORE paint — a scroll-event
// update always trails by a frame — so chrome lands in the same frame as content.
function useCanvasOverlayState() {
  const { frame, tick } = useIframe();
  const { selectedId, selectedIds, hoveredId, previewMode } = useEditor(
    useShallow((s) => ({
      selectedId: s.selectedId,
      selectedIds: s.selectedIds,
      hoveredId: s.hoveredId,
      previewMode: s.previewMode,
    })),
  );
  const dragActive = !!useDrag().type;
  // `rtTick`/`tick` are read so the overlay re-renders (re-measures) when the
  // rich-text selection changes or on scroll/resize/relayout.
  const { editor: rtEditor, tick: rtTick } = useRichText(
    useShallow((s) => ({ editor: s.editor, tick: s.tick })),
  );
  void rtTick;
  void tick;
  const editingText = !!rtEditor?.isFocused;
  const zoom = useCanvasZoom((s) => s.zoom);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const baseScroll = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => captureBaseScroll(frame, contentRef.current, baseScroll));

  const hasChrome = overlayHasChrome(selectedId, hoveredId, selectedIds.length);
  useEffect(
    () => startOverlaySync(frame, hasChrome, containerRef, contentRef, baseScroll, zoom),
    [frame, zoom, hasChrome],
  );

  return {
    frame,
    selectedId,
    selectedIds,
    hoveredId,
    previewMode,
    dragActive,
    editingText,
    zoom,
    containerRef,
    contentRef,
  };
}

// Top-document layer drawn over the iframe: selection/hover outline + the block
export function CanvasOverlay() {
  const {
    frame,
    selectedId,
    selectedIds,
    hoveredId,
    previewMode,
    dragActive,
    editingText,
    zoom,
    containerRef,
    contentRef,
  } = useCanvasOverlayState();

  if (!frame || previewMode) return null;

  const fb = frame.el.getBoundingClientRect();
  const showHover = shouldShowHover(hoveredId, selectedId, selectedIds);
  const multi = selectedIds.length > 1;
  // Secondary selections (everything but the primary) get an outline only.
  const secondary = selectedIds.filter((id) => id !== selectedId);

  // Stay mounted during a drag (so the active draggable's hook isn't torn down,
  // which would cancel the drag) — just hide the chrome while dragging.
  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed z-30 overflow-hidden transition-opacity duration-100"
      style={{
        top: fb.top,
        left: fb.left,
        width: fb.width,
        height: fb.height,
        opacity: dragActive ? 0 : 1,
      }}
    >
      <div ref={contentRef} className="absolute inset-0" style={{ willChange: "transform" }}>
        {showHover && hoveredId && (
          <BlockChrome
            key={"h:" + hoveredId}
            blockId={hoveredId}
            selected={false}
            frame={frame}
            dragActive={dragActive}
            hideToolbar={false}
            zoom={zoom}
          />
        )}
        {secondary.map((id) => (
          <BlockChrome
            key={"m:" + id}
            blockId={id}
            selected
            frame={frame}
            dragActive={dragActive}
            hideToolbar
            zoom={zoom}
          />
        ))}
        {selectedId && (
          <BlockChrome
            key={"s:" + selectedId}
            blockId={selectedId}
            selected
            frame={frame}
            dragActive={dragActive}
            hideToolbar={editingText || multi}
            zoom={zoom}
          />
        )}
      </div>
    </div>
  );
}

function BlockChrome({
  blockId,
  selected,
  frame,
  dragActive,
  hideToolbar,
  zoom,
}: {
  blockId: string;
  selected: boolean;
  frame: FrameInfo;
  dragActive: boolean;
  hideToolbar: boolean;
  zoom: number;
}) {
  const router = useRouter();
  const block = useEditor((s) => findBlockById(s.tree, blockId));
  const { remove, duplicate, detachComponent } = useEditor(
    useShallow((s) => ({
      remove: s.remove,
      duplicate: s.duplicate,
      detachComponent: s.detachComponent,
    })),
  );
  const components = useComponents();
  const actions = useEditorActions();

  const isComponent = block?.type === "component";
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useDraggable({
    id: blockId,
    data: { kind: "move", blockId, blockType: block?.type },
  });

  // Point the draggable node at the real block element inside the iframe so its
  // measured rect (translated to top-doc coords by DndContext) is the block.
  useEffect(() => {
    setNodeRef(frame.doc.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null);
  });

  // During a drag, stay mounted (keeps the active draggable's hook alive) but
  // render nothing — avoids getBoundingClientRect reflows on every frame.
  if (dragActive) return null;
  if (!block) return null;
  // Scaled rect, or null when the block element is gone or scrolled out of view.
  const rect = computeBlockChromeRect(frame, blockId, zoom);
  if (!rect) return null;
  const { sTop, sLeft, sW, sH } = rect;

  const def = getDefinition(block.type);
  const comp = isComponent ? components.map[block.props?.componentId as string] : undefined;
  const label = blockChromeLabel(isComponent, comp, def, block.type);

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute rounded-[2px]",
          outlineClass(isComponent, selected),
        )}
        style={{ top: sTop, left: sLeft, width: sW, height: sH, outlineOffset: -1 }}
      />

      {!hideToolbar && (
        <BlockToolbar
          block={block}
          comp={comp}
          isComponent={isComponent}
          selected={selected}
          label={label}
          sTop={sTop}
          sLeft={sLeft}
          frame={frame}
          attributes={attributes}
          listeners={listeners}
          setActivatorNodeRef={setActivatorNodeRef}
          router={router}
          detachComponent={detachComponent}
          duplicate={duplicate}
          remove={remove}
          saveAsComponent={actions.saveAsComponent}
        />
      )}
    </>
  );
}

function BlockToolbar({
  block,
  comp,
  isComponent,
  selected,
  label,
  sTop,
  sLeft,
  frame,
  attributes,
  listeners,
  setActivatorNodeRef,
  router,
  detachComponent,
  duplicate,
  remove,
  saveAsComponent,
}: {
  block: Block;
  comp: ComponentItem | undefined;
  isComponent: boolean;
  selected: boolean;
  label: string;
  sTop: number;
  sLeft: number;
  frame: FrameInfo;
  attributes: ReturnType<typeof useDraggable>["attributes"];
  listeners: ReturnType<typeof useDraggable>["listeners"];
  setActivatorNodeRef: ReturnType<typeof useDraggable>["setActivatorNodeRef"];
  router: ReturnType<typeof useRouter>;
  detachComponent: (instanceId: string, content: Block[]) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  saveAsComponent: (block: Block) => void;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto absolute z-10 flex items-center gap-0.5 rounded-lg px-1 py-0.5 text-[11px] font-medium text-white shadow-lg ring-1 ring-black/5",
        toolbarBgClass(isComponent, selected),
      )}
      // Sit just ABOVE the block (top-left) so it never covers the content;
      // drop just inside the top edge when there's no room above. The toolbar
      // itself stays unscaled (readable at any zoom) — only its anchor scales.
      style={{ top: sTop >= 30 ? sTop - 28 : sTop + 4, left: Math.max(sLeft, 2) }}
      // The toolbar is pointer-events-auto, so it would otherwise swallow the
      // wheel; forward it to the iframe so scrolling over the toolbar scrolls
      // the canvas like everywhere else.
      onWheel={(e) => frame.el.contentWindow?.scrollBy({ left: e.deltaX, top: e.deltaY })}
    >
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        className="flex cursor-grab touch-none items-center rounded-md p-1 transition-colors hover:bg-white/15 active:cursor-grabbing"
        title="Drag to move"
        aria-label="Drag to move"
      >
        <GripVertical size={13} />
      </button>
      <span className="flex items-center gap-1 px-1">
        {isComponent && <ComponentIcon size={11} />}
        {label}
      </span>

      {isComponent ? (
        <>
          <ToolBtn
            title="Edit component"
            onClick={() => router.push(`/component/${block.props.componentId}`)}
          >
            <Pencil size={13} />
          </ToolBtn>
          <ToolBtn title="Detach" onClick={() => comp && detachComponent(block.id, comp.content)}>
            <Unlink size={13} />
          </ToolBtn>
        </>
      ) : (
        <ToolBtn title="Save as component" onClick={() => saveAsComponent(block)}>
          <ComponentIcon size={13} />
        </ToolBtn>
      )}
      <ToolBtn title="Duplicate" onClick={() => duplicate(block.id)}>
        <Copy size={13} />
      </ToolBtn>
      <ToolBtn title="Delete" danger onClick={() => remove(block.id)}>
        <Trash2 size={13} />
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-md p-1 transition-colors hover:bg-white/15",
        danger && "hover:text-red-300",
      )}
    >
      {children}
    </motion.button>
  );
}
