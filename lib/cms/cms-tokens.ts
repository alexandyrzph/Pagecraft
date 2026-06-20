import type { Block } from "@/lib/types";

// ---------------------------------------------------------------------------
// Token substitution for CMS detail pages. A detail template is an ordinary
// block tree where string props may contain {{fieldKey}} placeholders; at
// render time we replace them with the current item's field values.
// ---------------------------------------------------------------------------

const TOKEN = /\{\{\s*([\w-]+)\s*\}\}/g;

function fillString(s: string, data: Record<string, unknown>): string {
  return s.replace(TOKEN, (_, key) => {
    const v = data[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

function fillValue(v: unknown, data: Record<string, unknown>): unknown {
  if (typeof v === "string") return fillString(v, data);
  if (Array.isArray(v)) return v.map((x) => fillValue(x, data));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = fillValue(val, data);
    return out;
  }
  return v;
}

/** Deep-clone a block tree with all {{token}} props filled from `data`. */
export function applyTokens(tree: Block[], data: Record<string, unknown>): Block[] {
  return tree.map((b) => ({
    ...b,
    props: fillValue(b.props ?? {}, data) as Record<string, unknown>,
    children: applyTokens(b.children ?? [], data),
  }));
}
