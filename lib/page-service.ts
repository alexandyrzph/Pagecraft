import { prisma } from "./prisma";
import { slugify } from "./utils";
import type { Block } from "./types";

/** Safely parse a stored content string into a block tree. */
export function parseContent(content: string): Block[] {
  try {
    const v = JSON.parse(content);
    return Array.isArray(v) ? (v as Block[]) : [];
  } catch {
    return [];
  }
}

/** Produce a slug derived from `title` that is unique within the given site. */
export async function uniqueSlug(siteId: string, title: string): Promise<string> {
  const base = slugify(title) || "page";
  for (let n = 1; n < 1000; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const existing = await prisma.page.findFirst({ where: { siteId, slug } });
    if (!existing) return slug;
  }
  return `${base}-${Date.now()}`;
}
