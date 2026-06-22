"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Block, Viewport } from "@/lib/types";
import { useEditor } from "@/store/editor-store";
import { useBreakpoints } from "@/store/breakpoints";
import { getDefinition } from "@/lib/blocks/registry";
import { useEditorActions } from "../editor-actions";
import { CUSTOM_INSPECTORS } from "../custom-inspectors";
import {
  ContentTabPanel,
  InspectorHeader,
  InspectorTabs,
  StyleTabPanel,
  type InspectorTab,
} from "./InspectorContent.helpers";

// --- inspector --------------------------------------------------------------

function useInspectorState() {
  const [tab, setTab] = useState<InspectorTab>("content");
  const viewport = useEditor((s) => s.viewport);
  const { setActive } = useBreakpoints();
  const duplicate = useEditor((s) => s.duplicate);
  const remove = useEditor((s) => s.remove);
  const select = useEditor((s) => s.select);
  const actions = useEditorActions();

  return { tab, setTab, viewport, setActive, duplicate, remove, select, actions };
}

export function InspectorContent({
  block,
  onHandlePointerDown,
  dragging,
  docked,
  onToggleDock,
}: {
  block: Block;
  onHandlePointerDown?: (e: React.PointerEvent) => void;
  dragging?: boolean;
  docked?: boolean;
  onToggleDock?: () => void;
}) {
  const { tab, setTab, viewport, setActive, duplicate, remove, select, actions } =
    useInspectorState();

  const def = getDefinition(block.type);
  if (!def) return null;
  const Icon = def.icon;
  const Custom = CUSTOM_INSPECTORS[block.type] ?? def.CustomContent;

  return (
    <>
      <InspectorHeader
        block={block}
        label={def.label}
        Icon={Icon}
        dragging={dragging}
        docked={docked}
        onHandlePointerDown={onHandlePointerDown}
        onSaveAsComponent={() => actions.saveAsComponent(block)}
        onDuplicate={() => duplicate(block.id)}
        onRemove={() => remove(block.id)}
        onToggleDock={onToggleDock}
        onClose={() => select(null)}
      />

      <InspectorTabs tab={tab} onSelect={setTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3"
        >
          {tab === "content" ? (
            <ContentTabPanel block={block} fields={def.fields} Custom={Custom} />
          ) : (
            <StyleTabPanel
              block={block}
              viewport={viewport}
              styleGroups={def.styleGroups}
              onSelectViewport={(id: Viewport) => setActive(id)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
