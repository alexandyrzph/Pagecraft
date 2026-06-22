import type { FrameInfo } from "./iframe-context";

// Selection/hover outline classes, keyed by component-vs-block and selected state.
export function outlineClass(isComponent: boolean, selected: boolean): string {
  if (isComponent) {
    return selected
      ? "outline outline-2 outline-violet-500"
      : "outline-dashed outline-1 outline-violet-300";
  }
  return selected
    ? "outline outline-2 outline-indigo-500"
    : "outline-dashed outline-1 outline-indigo-300";
}

// Toolbar pill background, keyed by component-vs-block and selected state.
export function toolbarBgClass(isComponent: boolean, selected: boolean): string {
  if (isComponent) return "bg-violet-600";
  return selected ? "bg-zinc-900" : "bg-zinc-900/85 backdrop-blur-sm";
}

// True when the block is scrolled out of the iframe viewport (so its chrome is
// hidden instead of left stuck at the edge). `rect` and `frameClientHeight` are
// both in the iframe's unscaled internal coordinate space.
function isChromeOutOfView(rect: DOMRect, frameClientHeight: number): boolean {
  return rect.bottom <= 4 || rect.top >= frameClientHeight - 4;
}

// True when any block is selected or hovered (so the overlay's rAF sync loop and
// chrome should run at all).
export function overlayHasChrome(
  selectedId: string | null,
  hoveredId: string | null,
  selectedCount: number,
): boolean {
  return !!(selectedId || hoveredId || selectedCount);
}

// True when the hovered block should get hover chrome — i.e. it isn't the primary
// selection and isn't part of the multi-selection.
export function shouldShowHover(
  hoveredId: string | null,
  selectedId: string | null,
  selectedIds: string[],
): boolean {
  return !!hoveredId && hoveredId !== selectedId && !selectedIds.includes(hoveredId);
}

// Scaled overlay rect for a block, or null when the block element is missing or
// scrolled out of the iframe viewport (so its chrome is hidden). `rect` is read
// from the iframe's unscaled coordinate space and multiplied by `zoom` to match
// the visually-scaled iframe.
export function computeBlockChromeRect(
  frame: FrameInfo,
  blockId: string,
  zoom: number,
): { sTop: number; sLeft: number; sW: number; sH: number } | null {
  const el = frame.doc.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (isChromeOutOfView(r, frame.el.clientHeight)) return null;
  return { sTop: r.top * zoom, sLeft: r.left * zoom, sW: r.width * zoom, sH: r.height * zoom };
}

// Toolbar label: the component's name (or "Component") for component instances,
// otherwise the block definition's label (falling back to the raw type).
export function blockChromeLabel(
  isComponent: boolean,
  comp: { name?: string } | undefined,
  def: { label?: string } | undefined,
  blockType: string,
): string {
  if (isComponent) return comp?.name ?? "Component";
  return def?.label ?? blockType;
}

// Capture the iframe's current scroll as the baseline the rAF transform is
// relative to, and clear any held transform so freshly-measured positions show
// un-offset for that commit. No-op until the iframe window exists.
export function captureBaseScroll(
  frame: FrameInfo | null,
  content: HTMLDivElement | null,
  baseRef: { current: { x: number; y: number } },
): void {
  const win = frame?.el.contentWindow;
  if (!win) return;
  baseRef.current = { x: win.scrollX, y: win.scrollY };
  if (content) content.style.transform = "";
}

// Start the rAF overlay-sync loop; returns a cleanup that cancels it. Returns a
// no-op cleanup when there is no frame or nothing to track, so the effect using
// it carries no inline branching.
export function startOverlaySync(
  frame: FrameInfo | null,
  hasChrome: boolean,
  containerRef: { current: HTMLDivElement | null },
  contentRef: { current: HTMLDivElement | null },
  baseRef: { current: { x: number; y: number } },
  zoom: number,
): () => void {
  if (!frame || !hasChrome) return () => {};
  let raf = 0;
  const sync = () => {
    syncOverlayPosition(frame, containerRef.current, contentRef.current, baseRef.current, zoom);
    raf = requestAnimationFrame(sync);
  };
  raf = requestAnimationFrame(sync);
  return () => cancelAnimationFrame(raf);
}

// Positions the overlay container over the iframe's live screen rect and applies
// the scaled scroll delta to the content layer, so chrome lands in the same frame
// as the iframe content with zero trailing.
function syncOverlayPosition(
  frame: FrameInfo,
  cont: HTMLDivElement | null,
  content: HTMLDivElement | null,
  base: { x: number; y: number },
  zoom: number,
): void {
  const fr = frame.el;
  const win = fr.contentWindow;
  if (!win) return;
  const r = fr.getBoundingClientRect();
  if (cont) {
    cont.style.top = `${r.top}px`;
    cont.style.left = `${r.left}px`;
    cont.style.width = `${r.width}px`;
    cont.style.height = `${r.height}px`;
  }
  if (content) {
    const dx = (win.scrollX - base.x) * zoom;
    const dy = (win.scrollY - base.y) * zoom;
    content.style.transform = `translate3d(${-dx}px, ${-dy}px, 0)`;
  }
}
