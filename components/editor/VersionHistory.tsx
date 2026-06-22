"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  useVersionHistoryState,
  VersionHistoryBody,
  VersionHistoryHeader,
} from "./VersionHistory.helpers";

export function VersionHistory({
  open,
  onClose,
  pageId,
  save,
}: {
  open: boolean;
  onClose: () => void;
  pageId: string | null;
  save: () => Promise<void>;
}) {
  const { versions, loading, busy, snapshot, restore, remove } = useVersionHistoryState({
    open,
    onClose,
    pageId,
    save,
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            <VersionHistoryHeader busy={busy} onSnapshot={snapshot} onClose={onClose} />

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <VersionHistoryBody
                loading={loading}
                versions={versions}
                busy={busy}
                onRestore={restore}
                onRemove={remove}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
