import { pathToBlock } from "@/lib/blocks/tree";
import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";
import { useComponents, type ComponentItem } from "./components-context";
import type { Block } from "@/lib/types";
import type { BlockDefinition } from "@/lib/blocks/registry-types";

export type BreadcrumbDerived = {
  multi: boolean;
  path: Block[] | null;
  show: boolean;
};

// Selection state → which HUD variant (if any) the breadcrumb should render.
// `multi` wins when more than one block is selected; otherwise a single selection
// resolves to its ancestor `path`. The HUD is hidden in preview mode or while the
// DOM-tree drawer is open.
export function deriveBreadcrumb(
  selectedId: string | null,
  selectedIds: string[],
  tree: Block[],
  previewMode: boolean,
  domOpen: boolean,
): BreadcrumbDerived {
  const multi = selectedIds.length > 1;
  const path = selectedId ? pathToBlock(tree, selectedId) : null;
  const show = !previewMode && !domOpen && (multi || !!path);
  return { multi, path, show };
}

// Crumb label: component instances show the component's name (or "Component"),
// other blocks use the registry label, falling back to the raw type.
export function crumbLabel(
  block: Block,
  def: BlockDefinition | undefined,
  componentsMap: Record<string, ComponentItem>,
): string {
  if (block.type === "component") {
    return componentsMap[block.props?.componentId as string]?.name ?? "Component";
  }
  return def?.label ?? block.type;
}

export type BreadcrumbState = BreadcrumbDerived & {
  selectedId: string | null;
  selectedIds: string[];
  select: (id: string | null) => void;
  duplicateSelected: () => void;
  removeSelected: () => void;
  pasteStyles: (id: string) => void;
  componentsMap: Record<string, ComponentItem>;
};

export function useSelectionBreadcrumbState(): BreadcrumbState {
  const selectedId = useEditor((s) => s.selectedId);
  const selectedIds = useEditor((s) => s.selectedIds);
  const tree = useEditor((s) => s.tree);
  const previewMode = useEditor((s) => s.previewMode);
  const select = useEditor((s) => s.select);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
  const removeSelected = useEditor((s) => s.removeSelected);
  const pasteStyles = useEditor((s) => s.pasteStyles);
  const componentsMap = useComponents().map;
  const domOpen = useEditorUI((s) => s.domTree);

  return {
    selectedId,
    selectedIds,
    select,
    duplicateSelected,
    removeSelected,
    pasteStyles,
    componentsMap,
    ...deriveBreadcrumb(selectedId, selectedIds, tree, previewMode, domOpen),
  };
}
