"use client";

import type { ComponentType } from "react";
import type { Block } from "@/lib/types";
import { CollectionInspector } from "./CollectionInspector";

/**
 * Editor-side registry of custom Content-tab inspectors, keyed by block type.
 * Kept out of the block definitions (which are server-safe pure data) so the
 * registry does not depend on editor components — avoids an import cycle.
 */
export const CUSTOM_INSPECTORS: Record<string, ComponentType<{ block: Block }>> = {
  collection: CollectionInspector,
};
