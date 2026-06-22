import type { Block, StyleProps } from "@/lib/types";

export const BREAKPOINTS = { tablet: 1024, mobile: 640 };

const VIEWPORTS = ["desktop", "tablet", "mobile"] as const;
type ViewportKey = (typeof VIEWPORTS)[number];

type BlockHidden = { desktop?: boolean; tablet?: boolean; mobile?: boolean };

/** Per-viewport CSS rules + visibility selectors collected across the tree. */
export type CollectedStyles = {
  rules: Record<ViewportKey, string[]>;
  hidden: Record<ViewportKey, string[]>;
};

/** Wrap a bare image URL so it works as a CSS background-image value. */
export function normalizeBg(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (/^(url\(|linear-gradient|radial-gradient|conic-gradient|none)/.test(v)) {
    return v;
  }
  return `url("${v}")`;
}

export const camelToKebab = (s: string): string =>
  s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Serialize a StyleProps object into a CSS declaration string. */
export function cssText(sp: StyleProps): string {
  const parts: string[] = [];
  for (const [k, raw] of Object.entries(sp)) {
    if (raw == null || raw === "") continue;
    let value = String(raw);
    if (k === "backgroundImage") value = normalizeBg(value);
    parts.push(`${camelToKebab(k)}: ${value};`);
  }
  return parts.join(" ");
}

/** Collect every block's id + styles (depth-first) for stylesheet generation. */
export function flatten(tree: Block[], acc: Block[] = []): Block[] {
  for (const b of tree) {
    acc.push(b);
    flatten(b.children, acc);
  }
  return acc;
}

/** Walk the tree, bucketing each block's CSS rules and hidden selectors per viewport. */
export function collectStyles(tree: Block[]): CollectedStyles {
  const rules: Record<ViewportKey, string[]> = { desktop: [], tablet: [], mobile: [] };
  const hidden: Record<ViewportKey, string[]> = { desktop: [], tablet: [], mobile: [] };

  for (const b of flatten(tree)) {
    const sel = `.b-${b.id}`;
    for (const vp of VIEWPORTS) {
      const sp = b.styles[vp];
      if (!sp) continue;
      const t = cssText(sp);
      if (t) rules[vp].push(`${sel} { ${t} }`);
    }
    const flags = b.props?.hidden as BlockHidden | undefined;
    for (const vp of VIEWPORTS) {
      if (flags?.[vp]) hidden[vp].push(sel);
    }
  }
  return { rules, hidden };
}

/** Wrap a list of CSS rule lines in a media query, or "" when the list is empty. */
export function mediaBlock(query: string, lines: string[]): string {
  if (!lines.length) return "";
  return `\n@media ${query} {\n${lines.join("\n")}\n}`;
}

/** The visibility declaration applied to hidden blocks (ghost in editor, removed live). */
export function hideDeclaration(editable: boolean | undefined): string {
  return editable
    ? "opacity: 0.35 !important; outline: 1px dashed rgba(99,102,241,0.7); outline-offset: -1px;"
    : "display: none !important;";
}
