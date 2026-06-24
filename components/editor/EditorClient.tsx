"use client";

import { useEffect, useRef } from "react";
import { DndContext, DragOverlay, MeasuringStrategy, closestCenter } from "@dnd-kit/core";
import type { Block, Seo, Theme } from "@/lib/types";
import { useEditor } from "@/store/editor-store";
import { BlockRenderer } from "@/components/BlockRenderer";
import { DragProvider } from "./drag-context";
import { ComponentsProvider } from "./components-context";
import { CollectionsProvider } from "./collections-context";
import { SiteProvider } from "./site-context";
import { EditorActionsProvider } from "./editor-actions";
import { IframeProvider, type FrameInfo } from "./iframe-context";
import { useEditorClientState } from "./EditorClient.helpers";
import { CanvasOverlay } from "./CanvasOverlay";
import { SelectionBreadcrumb } from "./SelectionBreadcrumb";
import { DomTreePanel } from "./DomTreePanel";
import { UnsavedModal } from "./UnsavedModal";
import { SaveComponentModal } from "./SaveComponentModal";
import { TopBar } from "./TopBar";
import { LeftPanel } from "./LeftPanel";
import { Canvas } from "./Canvas";
import { FloatingInspector } from "./Inspector";
import { EditorSkeleton } from "./EditorSkeleton";
import { CommandPalette } from "./CommandPalette";
import { GhostCard } from "./GhostCard";
import { ContextMenu } from "./ContextMenu";
import { SectionInserter } from "./SectionInserter";
import { AiGenerateModal } from "./AiGenerateModal";
import { RichTextToolbar } from "./RichTextToolbar";
import { VersionHistory } from "./VersionHistory";
import { ShotFrame } from "./ShotFrame";
import { requestThumbnailCapture } from "@/lib/thumbnails/capture-controller";

export type PageDTO = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  noindex?: boolean | null;
  content: Block[];
  seo?: Seo;
  theme?: Theme;
  thumbnailStale?: boolean;
};

export function EditorClient({
  page,
  mode = "page",
  siteRegion,
}: {
  page: PageDTO;
  mode?: "page" | "component" | "site" | "collection";
  siteRegion?: "header" | "footer";
}) {
  // The mutated iframe ref lives here (react-compiler forbids mutating a ref
  // returned from a custom hook); everything else is collapsed into one hook.
  const frameRef = useRef<FrameInfo | null>(null);
  const {
    ready,
    paletteOpen,
    setPaletteOpen,
    historyOpen,
    setHistoryOpen,
    iframeCtx,
    tree,
    dragDrop,
    editorData,
    persistence,
    navigation,
  } = useEditorClientState({ page, mode, siteRegion, frameRef });

  const { drag, sensors, measure, onDragStart, onDragEnd, onDragCancel } = dragDrop;
  const { componentsCtx, collectionsCtx, siteCtx, componentsMap, collectionsMap } = editorData;
  const { save, saveManual, publish, unpublish, exportHtml, exportRef } = persistence;
  const { actionsCtx, pending, setPending, saveCompBlock, setSaveCompBlock, persistComponent } =
    navigation;

  useEffect(() => {
    if (mode !== "page" || !ready || !page.thumbnailStale) return;
    const t = setTimeout(() => void requestThumbnailCapture({ force: true }), 1500);
    return () => clearTimeout(t);
  }, [mode, ready, page.thumbnailStale]);

  if (!ready) return <EditorSkeleton />;

  return (
    <IframeProvider value={iframeCtx}>
      <ComponentsProvider value={componentsCtx}>
        <CollectionsProvider value={collectionsCtx}>
          <SiteProvider value={siteCtx}>
            <EditorActionsProvider value={actionsCtx}>
              <DragProvider value={drag}>
                <DndContext
                  id="pagebuilder-dnd"
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  measuring={{
                    droppable: { strategy: MeasuringStrategy.WhileDragging, measure },
                    draggable: { measure },
                  }}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragCancel={onDragCancel}
                >
                  <div className="flex h-screen flex-col overflow-clip overscroll-none bg-zinc-100">
                    <TopBar
                      mode={mode}
                      onSave={saveManual}
                      onExport={exportHtml}
                      onPublish={publish}
                      onUnpublish={unpublish}
                      onOpenPalette={() => setPaletteOpen(true)}
                      onOpenHistory={() => setHistoryOpen(true)}
                    />
                    <div className="flex min-h-0 flex-1">
                      <LeftPanel />
                      <Canvas />
                    </div>
                    <FloatingInspector />
                    <CanvasOverlay />
                    <SelectionBreadcrumb />
                    <DomTreePanel />
                  </div>

                  <DragOverlay dropAnimation={null}>
                    {drag.ghost ? (
                      <GhostCard block={drag.ghost} components={componentsMap} />
                    ) : null}
                  </DragOverlay>

                  <CommandPalette
                    open={paletteOpen}
                    onClose={() => setPaletteOpen(false)}
                    onSave={saveManual}
                    onExport={exportHtml}
                    onPublish={publish}
                  />
                </DndContext>

                {/* hidden clean render used by HTML export */}
                <div ref={exportRef} className="hidden" aria-hidden>
                  <BlockRenderer
                    tree={tree}
                    viewport="desktop"
                    inlineStyles={false}
                    components={componentsMap}
                    collections={collectionsMap}
                  />
                </div>

                {mode === "page" && <ShotFrame />}

                <UnsavedModal
                  open={!!pending}
                  onCancel={() => setPending(null)}
                  onDiscard={() => {
                    useEditor.setState({ dirty: false });
                    pending?.run();
                    setPending(null);
                  }}
                  onSave={async () => {
                    await save();
                    pending?.run();
                    setPending(null);
                  }}
                />

                <SaveComponentModal
                  open={!!saveCompBlock}
                  defaultName="New component"
                  onCancel={() => setSaveCompBlock(null)}
                  onSave={persistComponent}
                />

                <ContextMenu />
                <SectionInserter />
                <AiGenerateModal />
                <RichTextToolbar />
                <VersionHistory
                  open={historyOpen}
                  onClose={() => setHistoryOpen(false)}
                  pageId={page.id}
                  save={save}
                />
              </DragProvider>
            </EditorActionsProvider>
          </SiteProvider>
        </CollectionsProvider>
      </ComponentsProvider>
    </IframeProvider>
  );
}
