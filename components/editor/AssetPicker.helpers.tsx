"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Upload } from "lucide-react";
import { uploadFile, formatBytes, type UploadedAsset } from "@/lib/upload";
import { useAlert } from "@/components/ui/dialog-provider";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

type AlertFn = ReturnType<typeof useAlert>;
type AssetKind = "image" | "all";

/** Fetch the asset library for `kind` and push it into state, ignoring errors. */
export function fetchAssets(
  kind: AssetKind,
  setAssets: Dispatch<SetStateAction<UploadedAsset[]>>,
  setLoading: Dispatch<SetStateAction<boolean>>,
): void {
  api
    .get(endpoints.assets(kind === "image" ? { kind: "image" } : undefined))
    .then((r) => r.data)
    .then((d) => setAssets(Array.isArray(d) ? d : []))
    .catch(() => {})
    .finally(() => setLoading(false));
}

/** Upload the picked files, prepend them, and select+close on the first one. */
export async function uploadPickedFiles(
  files: FileList | null,
  deps: {
    setBusy: Dispatch<SetStateAction<boolean>>;
    setAssets: Dispatch<SetStateAction<UploadedAsset[]>>;
    onSelect: (url: string) => void;
    onClose: () => void;
    alert: AlertFn;
  },
): Promise<void> {
  const { setBusy, setAssets, onSelect, onClose, alert } = deps;
  if (!files?.length) return;
  setBusy(true);
  try {
    const uploaded: UploadedAsset[] = [];
    for (const f of Array.from(files)) uploaded.push(await uploadFile(f));
    setAssets((a) => [...uploaded, ...a]);
    if (uploaded[0]) {
      onSelect(uploaded[0].url);
      onClose();
    }
  } catch (e) {
    await alert({
      title: "Upload failed",
      message: e instanceof Error ? e.message : "Please try again.",
    });
  } finally {
    setBusy(false);
  }
}

/**
 * All of the AssetPicker's hooks in one place: store/dialog access, the asset
 * list, the load/busy flags, and the open+kind→reload sync. Returns plain
 * values and callbacks so the component itself stays at ~1 hook-density.
 */
export function useAssetPickerState({
  open,
  kind,
  onSelect,
  onClose,
}: {
  open: boolean;
  kind: AssetKind;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const alert = useAlert();
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadKey, setLoadKey] = useState<string | null>(null);

  const curKey = open ? kind : null;
  syncLoadKey(curKey, loadKey, setLoadKey, setLoading);

  useEffect(() => {
    if (open) fetchAssets(kind, setAssets, setLoading);
  }, [open, kind]);

  const onFiles = (files: FileList | null) =>
    uploadPickedFiles(files, { setBusy, setAssets, onSelect, onClose, alert });

  return { assets, loading, busy, onFiles };
}

/**
 * Render-time sync: when the open/kind key changes, remember it and flip into
 * the loading state for the upcoming fetch. Kept as a plain helper so the hook
 * above is free of inline conditionals.
 */
function syncLoadKey(
  curKey: string | null,
  loadKey: string | null,
  setLoadKey: Dispatch<SetStateAction<string | null>>,
  setLoading: Dispatch<SetStateAction<boolean>>,
): void {
  if (curKey === loadKey) return;
  setLoadKey(curKey);
  if (curKey !== null) setLoading(true);
}

export function AssetSkeletonGrid() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="pc-skeleton aspect-square rounded-lg" />
      ))}
    </div>
  );
}

export function AssetEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <div className="rounded-xl bg-zinc-100 p-3 text-zinc-400">
        <Upload size={20} />
      </div>
      <p className="text-sm font-semibold text-zinc-600">No uploads yet</p>
      <p className="text-xs text-zinc-400">Upload an image to get started.</p>
    </div>
  );
}

export function AssetGrid({
  assets,
  onPick,
}: {
  assets: UploadedAsset[];
  onPick: (url: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {assets.map((a) => (
        <button
          key={a.id}
          onClick={() => onPick(a.url)}
          title={`${a.name} · ${formatBytes(a.size)}`}
          className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 transition-all hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md"
        >
          {a.type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-medium text-zinc-500">
              {a.name}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
