"use client";

import { useRef } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  AssetEmptyState,
  AssetGrid,
  AssetSkeletonGrid,
  useAssetPickerState,
} from "./AssetPicker.helpers";

export function AssetPicker({
  open,
  kind = "image",
  onSelect,
  onClose,
}: {
  open: boolean;
  kind?: "image" | "all";
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { assets, loading, busy, onFiles } = useAssetPickerState({ open, kind, onSelect, onClose });

  const pick = (url: string) => {
    onSelect(url);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
        <h2 className="text-sm font-bold tracking-tight text-zinc-900">Media library</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X size={18} />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={kind === "image" ? "image/*" : undefined}
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {loading ? (
          <AssetSkeletonGrid />
        ) : assets.length === 0 ? (
          <AssetEmptyState />
        ) : (
          <AssetGrid assets={assets} onPick={pick} />
        )}
      </div>
    </Modal>
  );
}
