"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PanelBottom } from "lucide-react";
import {
  asideClassName,
  countNodes,
  dockZoneClassName,
  makePassthrough,
  positionStyleFor,
  runHeaderDown,
  runResizeDown,
  runSelectMode,
  useDomTreePanelState,
  type Dims,
  type Mode,
} from "./DomTreePanel.helpers";
import {
  DomTreeBody,
  DomTreeHeader,
  FloatResizeHandles,
  TopResizeHandle,
} from "./DomTreePanel.parts";

export function DomTreePanel() {
  const state = useDomTreePanelState();
  const { open, close, tree, mode, height, flt, dragging, dockHint, lastDock } = state;
  const fltInit = useRef(false);

  const passthrough = makePassthrough(state.frame);
  const onHeaderDown = (e: React.PointerEvent) => runHeaderDown(e, { state, fltInit, passthrough });
  const onResizeDown = (e: React.PointerEvent, dims: Dims) =>
    runResizeDown(e, dims, { state, passthrough });
  const selectMode = (m: Mode) => runSelectMode(m, { state, fltInit });

  const float = mode === "float";

  return (
    <>
      {/* dock-zone preview while dragging toward the bottom edge — animates in
          with a spring fade/slide and shows a "drop to dock" affordance. */}
      <AnimatePresence>
        {open && dragging && dockHint && (
          <motion.div
            key="dock-zone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className={dockZoneClassName(lastDock)}
          >
            <motion.span
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="mb-4 flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white shadow-lg"
            >
              <PanelBottom size={12} /> Drop to dock
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.aside
            // keyed on dock-vs-float so detaching/re-docking replays the entrance
            // animation (a pop when it detaches, a slide-up when it re-docks).
            // Position/size are inline styles (not framer-animated), so dragging
            // and resizing stay instant regardless of this transition.
            key={float ? "domtree-float" : "domtree-dock"}
            initial={float ? { opacity: 0, scale: 0.9, y: 8 } : { y: "100%" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={float ? { opacity: 0, scale: 0.92 } : { opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 460, damping: 34 }}
            className={asideClassName(float, mode)}
            style={positionStyleFor(float, flt, height)}
          >
            {/* top resize handle (docked modes) */}
            {!float && <TopResizeHandle onResizeDown={onResizeDown} />}

            {/* header (drag to move / detach) */}
            <DomTreeHeader
              float={float}
              count={countNodes(tree)}
              mode={mode}
              onHeaderDown={onHeaderDown}
              onSelectMode={selectMode}
              onClose={close}
            />

            {/* tree */}
            <DomTreeBody tree={tree} />

            {/* float resize handles: right edge, bottom edge, SE corner */}
            {float && <FloatResizeHandles onResizeDown={onResizeDown} />}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
