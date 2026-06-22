"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DeviceFrame } from "./DeviceFrame";
import { CanvasFrame } from "./CanvasFrame";
import { DeviceResizer } from "./DeviceResizer";
import {
  CanvasContent,
  applyAutoFit,
  contentMotionKey,
  createStartResize,
  deriveRenderWidth,
  deriveRenderZoom,
  isDesktopFill,
  measureAvail,
  useCanvasState,
} from "./Canvas.helpers";

export function Canvas() {
  const s = useCanvasState();
  const resizing = s.resizeSide !== null;
  const desktopFill = isDesktopFill(s.active, s.dragWidth);

  const startResize = createStartResize({
    active: s.active,
    zoom: s.zoom,
    frame: s.frame,
    setResizeSide: s.setResizeSide,
    setDragWidth: s.setDragWidth,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastFitKey = useRef("");

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => measureAvail(el, s.setAvail, s.setViewportWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [s.setAvail, s.setViewportWidth]);

  useEffect(() => {
    applyAutoFit({
      availW: s.avail.w,
      desktopFill,
      activeId: s.active.id,
      activeWidth: s.active.width,
      lastFitKey,
      setZoom: s.setZoom,
    });
  }, [desktopFill, s.active.id, s.active.width, s.avail.w, s.setZoom]);

  // Authoring viewport follows the active breakpoint's base bucket.
  const { id: activeId, base: activeBase } = s.active;
  const setViewport = s.setViewport;
  useEffect(() => {
    setViewport(activeBase);
  }, [activeId, activeBase, setViewport]);

  const renderWidth = deriveRenderWidth(desktopFill, s.avail.w, s.active);
  const renderZoom = deriveRenderZoom(desktopFill, s.zoom);

  const content = (
    <CanvasContent
      previewMode={s.previewMode}
      tree={s.tree}
      header={s.header}
      footer={s.footer}
      componentsMap={s.componentsMap}
      collectionsMap={s.collectionsMap}
    />
  );

  return (
    <div
      ref={scrollRef}
      className={cn(
        "relative flex flex-1 overflow-auto overscroll-none bg-zinc-100",
        desktopFill ? "p-0" : "p-6 lg:p-10",
      )}
      onClick={() => s.select(null)}
    >
      {/* Scroll footprint: takes the device's *scaled* size so overflow-auto can
          reveal a zoomed-in canvas. The inner box keeps the device's logical
          size and is visually scaled with a transform. While actively resizing,
          width transitions are off so the device tracks the cursor 1:1. */}
      <div
        className={cn(
          "relative mx-auto h-full shrink-0",
          !resizing && "transition-[width] duration-300 ease-out",
        )}
        style={{
          width: renderWidth * renderZoom,
          height: s.avail.h ? s.avail.h * renderZoom : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "h-full origin-top-left will-change-transform",
            !resizing && "transition-[width,transform] duration-300 ease-out",
          )}
          style={{
            width: renderWidth,
            height: s.avail.h || undefined,
            transform: `scale(${renderZoom})`,
          }}
        >
          <DeviceFrame viewport={s.active.base} slug={s.slug} fullBleed={desktopFill}>
            <CanvasFrame
              tree={s.tree}
              theme={s.theme}
              editable={!s.previewMode}
              cssExtra={s.cssExtra}
            >
              <motion.div
                key={contentMotionKey(s.pageId, s.previewMode)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="min-h-full"
              >
                {content}
              </motion.div>
            </CanvasFrame>
          </DeviceFrame>
        </div>

        {/* drag-to-resize "pipes" on each side of the device (edit mode only) */}
        {!s.previewMode && !desktopFill && (
          <>
            <DeviceResizer
              side="left"
              width={s.active.width}
              resizing={s.resizeSide === "left"}
              onPointerDown={startResize("left")}
            />
            <DeviceResizer
              side="right"
              width={s.active.width}
              resizing={s.resizeSide === "right"}
              onPointerDown={startResize("right")}
            />
          </>
        )}
      </div>
    </div>
  );
}
