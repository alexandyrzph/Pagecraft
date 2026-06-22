import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";

// Action-button triggers embedded in the placeholder / canvas (generate with AI,
// open inserter, quick-add block). Returns true when the pointerdown was consumed
// so the caller can stop before running block selection.
export function handleActionButtons(e: Event): boolean {
  const t = e.target as HTMLElement;
  // "generate with AI" trigger in the empty-state placeholder
  if (t?.closest?.("[data-open-ai]")) {
    e.preventDefault();
    useEditorUI.getState().openAi();
    return true;
  }
  // "add section" inserter triggers in the placeholder / canvas
  const insBtn = t?.closest?.("[data-open-inserter]") as HTMLElement | null;
  if (insBtn) {
    e.preventDefault();
    const parent = insBtn.getAttribute("data-open-inserter");
    const idx = insBtn.getAttribute("data-insert-index");
    useEditorUI.getState().openInserter({
      parentId: parent && parent !== "root" ? parent : null,
      index: idx != null ? Number(idx) : -1,
    });
    return true;
  }
  // quick-add buttons in the empty-state placeholder
  const addBtn = t?.closest?.("[data-add-block]") as HTMLElement | null;
  if (addBtn) {
    e.preventDefault();
    const type = addBtn.getAttribute("data-add-block");
    if (type == null) return true;
    const parent = addBtn.getAttribute("data-add-parent");
    useEditor.getState().addBlock(type, parent && parent !== "root" ? parent : null, 0);
    return true;
  }
  return false;
}
