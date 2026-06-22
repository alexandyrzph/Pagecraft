"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getDefinition } from "@/lib/blocks/registry";
import type { Block, Viewport } from "@/lib/types";
import { useEditor } from "@/store/editor-store";
import { Slot, EmptyDrop } from "./Slot";
import { useDrag, type DragInfo } from "./drag-context";
import { useComponents } from "./components-context";
import type { ComponentItem } from "./components-context";
import {
  blockClassName,
  blockHtmlId,
  buildContainerChildren,
  ComponentBody,
  scrollNewIntoView,
} from "./EditorBlock.helpers";

export function SlottedChildren({
  parentId,
  parentType,
  items,
  emptyMinHeight,
}: {
  parentId: string | null;
  parentType: string | null;
  items: Block[];
  emptyMinHeight?: number;
}) {
  if (items.length === 0) {
    return <EmptyDrop parentId={parentId} parentType={parentType} minHeight={emptyMinHeight} />;
  }
  return (
    <>
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((child, i) => (
          <EditorBlock
            key={child.id}
            block={child}
            parentId={parentId}
            parentType={parentType}
            index={i}
          />
        ))}
      </AnimatePresence>
      <Slot parentId={parentId} parentType={parentType} index={items.length} />
    </>
  );
}

type EditorBlockState = {
  components: { map: Record<string, ComponentItem> };
  viewport: Viewport;
  setProp: (id: string, key: string, value: unknown) => void;
  isNew: boolean;
  clearLastAdded: () => void;
  drag: DragInfo;
};

// All store/context reads for one EditorBlock, collected in a single custom
// hook so the component sits at low hook-density. Just hook calls + a return.
function useEditorBlockState(blockId: string): EditorBlockState {
  const components = useComponents();
  const viewport = useEditor((s) => s.viewport);
  const setProp = useEditor((s) => s.setProp);
  const isNew = useEditor((s) => s.lastAddedId === blockId);
  const clearLastAdded = useEditor((s) => s.clearLastAdded);
  const drag = useDrag();
  return { components, viewport, setProp, isNew, clearLastAdded, drag };
}

// A block inside the editable canvas. The visual content lives here (portaled
// into the iframe); selection chrome + the toolbar/drag-handle are drawn by the
// top-document CanvasOverlay, anchored to this node's `data-block-id`.
function EditorBlock({
  block,
  parentId,
  parentType,
  index,
}: {
  block: Block;
  parentId: string | null;
  parentType: string | null;
  index: number;
}) {
  const { components, viewport, setProp, isNew, clearLastAdded, drag } = useEditorBlockState(
    block.id,
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isNew) return;
    return scrollNewIntoView(ref, clearLastAdded);
  }, [isNew, clearLastAdded]);

  const def = getDefinition(block.type);
  const isComponent = block.type === "component";
  const comp = isComponent ? components.map[block.props?.componentId as string] : undefined;
  const isDragging = drag.id === block.id;

  if (!isComponent && !def) return null;

  // --- body -----------------------------------------------------------------
  let body: ReactNode;
  if (isComponent) {
    body = <ComponentBody comp={comp} viewport={viewport} componentsMap={components.map} />;
  } else {
    if (!def) return null;
    const Cmp = def.Render;
    const children = buildContainerChildren(
      block,
      (c, i) => (
        <EditorBlock key={c.id} block={c} parentId={block.id} parentType={block.type} index={i} />
      ),
      (items, emptyMinHeight) => (
        <SlottedChildren
          parentId={block.id}
          parentType={block.type}
          items={items}
          emptyMinHeight={emptyMinHeight}
        />
      ),
    );
    body = (
      // style is intentionally empty — the injected responsive stylesheet
      // (.b-<id> base + @media) drives styling so breakpoints resolve live.
      <Cmp
        block={block}
        viewport={viewport}
        editable
        selected={false}
        style={{}}
        className={blockClassName(block)}
        id={blockHtmlId(block)}
        setProp={(k, v) => setProp(block.id, k, v)}
      >
        {children}
      </Cmp>
    );
  }

  return (
    <motion.div
      ref={ref}
      data-block-id={block.id}
      data-block-type={block.type}
      data-is-component={isComponent ? "1" : undefined}
      layout={drag.type ? false : "position"}
      initial={isNew ? { opacity: 0, y: 16, scale: 0.97 } : false}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18, ease: "easeIn" } }}
      transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.7 }}
      className="relative"
    >
      <Slot parentId={parentId} parentType={parentType} index={index} />
      {body}
    </motion.div>
  );
}
