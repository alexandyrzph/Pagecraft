import type { CSSProperties } from "react";
import type { Block, ResponsiveStyles, StyleProps, Viewport } from "@/lib/types";
import {
  BREAKPOINTS,
  collectStyles,
  cssText,
  hideDeclaration,
  mediaBlock,
  normalizeBg,
} from "./styles.helpers";

export { BREAKPOINTS };

// ---------------------------------------------------------------------------
// Turn the per-viewport style model into something renderable.
//
//  - resolveStyles(): merged inline CSS for ONE viewport (used by the editor
//    canvas, which previews a single viewport at a time). Desktop-first cascade.
//  - responsiveCss(): a stylesheet with @media overrides for tablet/mobile,
//    scoped per block via `.b-<id>` (used by the public page and HTML export).
// ---------------------------------------------------------------------------

// --- Author custom attributes (per-block HTML id + extra classes) -----------

/** Sanitized HTML id an author set on a block (spaces → dashes), or undefined. */
export function blockHtmlId(block: Block): string | undefined {
  const raw = (block.props?.htmlId as string | undefined)?.trim();
  return raw ? raw.replace(/\s+/g, "-") : undefined;
}

/** Extra CSS class string an author set on a block (space-separated), or "". */
export function blockHtmlClass(block: Block): string {
  return (block.props?.htmlClass as string | undefined)?.trim() ?? "";
}

function applyStyle(out: Record<string, string>, sp: StyleProps) {
  for (const [k, raw] of Object.entries(sp)) {
    if (raw == null || raw === "") continue;
    let value = String(raw);
    if (k === "backgroundImage") value = normalizeBg(value);
    out[k] = value;
  }
}

/** Merged inline styles for a single viewport (desktop-first cascade). */
export function resolveStyles(styles: ResponsiveStyles, viewport: Viewport): CSSProperties {
  const out: Record<string, string> = {};
  if (styles.desktop) applyStyle(out, styles.desktop);
  if (viewport === "tablet" || viewport === "mobile") {
    if (styles.tablet) applyStyle(out, styles.tablet);
  }
  if (viewport === "mobile") {
    if (styles.mobile) applyStyle(out, styles.mobile);
  }
  return out as CSSProperties;
}

/** Serialize a StyleProps object into a CSS declaration string. */
export function styleDeclarations(sp: StyleProps): string {
  return cssText(sp);
}

/**
 * Build a scoped stylesheet for the whole tree. Desktop rules are emitted as
 * base; tablet/mobile rules go inside max-width media queries so the published
 * page is genuinely responsive.
 */
export function responsiveCss(tree: Block[], opts: { editable?: boolean } = {}): string {
  const { rules, hidden } = collectStyles(tree);

  let css = rules.desktop.join("\n");
  css += mediaBlock(`(max-width: ${BREAKPOINTS.tablet}px)`, rules.tablet);
  css += mediaBlock(`(max-width: ${BREAKPOINTS.mobile}px)`, rules.mobile);

  // Visibility uses *bounded* device ranges so each breakpoint toggles
  // independently. On the public page a hidden block is removed (display:none);
  // in the editor it's kept as a selectable ghost so authors can re-show it.
  const hideDecl = hideDeclaration(opts.editable);
  const hideRules = (sels: string[]) => sels.map((s) => `${s} { ${hideDecl} }`);
  css += mediaBlock(`(min-width: ${BREAKPOINTS.tablet + 1}px)`, hideRules(hidden.desktop));
  css += mediaBlock(
    `(min-width: ${BREAKPOINTS.mobile + 1}px) and (max-width: ${BREAKPOINTS.tablet}px)`,
    hideRules(hidden.tablet),
  );
  css += mediaBlock(`(max-width: ${BREAKPOINTS.mobile}px)`, hideRules(hidden.mobile));
  return css;
}
