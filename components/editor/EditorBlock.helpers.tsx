"use client";

import { type ReactNode, type RefObject } from "react";
import { Component as ComponentIcon } from "lucide-react";
import { getDefinition } from "@/lib/blocks/registry";
import { blockHtmlClass, blockHtmlId } from "@/lib/blocks/styles";
import { cn } from "@/lib/utils";
import type { Block, Viewport } from "@/lib/types";
import { BlockRenderer } from "@/components/BlockRenderer";
import type { ComponentItem } from "./components-context";

// Scroll a freshly-added block into view on the next frame, then clear the
// "last added" marker. Returns the rAF cleanup. Extracted so the component's
// effect body stays branch-free.
export function scrollNewIntoView(
  ref: RefObject<HTMLDivElement | null>,
  clearLastAdded: () => void,
) {
  const raf = requestAnimationFrame(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    clearLastAdded();
  });
  return () => cancelAnimationFrame(raf);
}

// A synced component instance previews its content read-only (clicks pass
// through), or shows a "not found" placeholder when the source is missing.
export function ComponentBody({
  comp,
  viewport,
  componentsMap,
}: {
  comp: ComponentItem | undefined;
  viewport: Viewport;
  componentsMap: Record<string, ComponentItem>;
}) {
  return (
    <div className="pointer-events-none">
      {comp ? (
        <BlockRenderer
          tree={comp.content}
          viewport={viewport}
          inlineStyles={false}
          components={componentsMap}
        />
      ) : (
        <div className="flex items-center justify-center gap-2 bg-violet-50 p-8 text-sm font-medium text-violet-500">
          <ComponentIcon size={16} /> Component not found
        </div>
      )}
    </div>
  );
}

// Editable children for a block's render root. Non-containers get `undefined`
// (so the render component sees no children, as before). "fixed" containers
// (e.g. columns) map their children directly; "slotted" containers render
// drop-zone slots.
export function buildContainerChildren(
  block: Block,
  renderChild: (child: Block, index: number) => ReactNode,
  renderSlotted: (items: Block[], emptyMinHeight?: number) => ReactNode,
): ReactNode {
  const def = getDefinition(block.type);
  if (!def?.isContainer) return undefined;
  if (def.containerStrategy === "fixed") {
    return block.children.map((c, i) => renderChild(c, i));
  }
  return renderSlotted(block.children, def.emptyMinHeight);
}

// The class hook string applied to a block's render root: the per-block
// `b-<id>` selector, an optional text-style class, and any author classes.
export function blockClassName(block: Block): string {
  const textStyle = block.props?.textStyle as string;
  return cn(`b-${block.id}`, textStyle && `ts-${textStyle}`, blockHtmlClass(block));
}

export { blockHtmlId };
