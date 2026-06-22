"use client";

import { SavingBar, TopBarActions, TopBarBrand, TopBarCenter } from "./TopBar.parts";
import { isComponentMode, useTopBarState, type TopBarMode } from "./TopBar.helpers";

export function TopBar({
  onSave,
  onExport,
  onPublish,
  onUnpublish,
  onOpenPalette,
  onOpenHistory,
  mode = "page",
}: {
  onSave: () => void;
  onExport: () => void;
  onPublish: () => void;
  onUnpublish?: () => void;
  onOpenPalette: () => void;
  onOpenHistory: () => void;
  mode?: TopBarMode;
}) {
  const {
    previewMode,
    togglePreview,
    undo,
    redo,
    canUndo,
    canRedo,
    published,
    slug,
    saving,
    domTree,
    toggleDomTree,
    autosave,
    toggleAutosave,
    goHome,
  } = useTopBarState();
  const componentMode = isComponentMode(mode);

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-3">
      {/* left: brand + breadcrumb */}
      <TopBarBrand mode={mode} goHome={goHome} onOpenPalette={onOpenPalette} />

      {/* center: canvas zoom + responsive breakpoint switch */}
      <TopBarCenter />

      {/* right: icon-only actions with tooltips */}
      <TopBarActions
        undo={undo}
        canUndo={canUndo}
        redo={redo}
        canRedo={canRedo}
        toggleDomTree={toggleDomTree}
        domTree={domTree}
        togglePreview={togglePreview}
        previewMode={previewMode}
        mode={mode}
        onOpenHistory={onOpenHistory}
        componentMode={componentMode}
        onExport={onExport}
        autosave={autosave}
        toggleAutosave={toggleAutosave}
        onSave={onSave}
        goHome={goHome}
        published={published}
        slug={slug}
        onUnpublish={onUnpublish}
        onPublish={onPublish}
      />

      {/* indeterminate autosave progress bar */}
      {saving && <SavingBar />}
    </header>
  );
}
