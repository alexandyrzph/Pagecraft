import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { blankItemData, uniqueFieldKey } from "@/lib/cms/cms";
import type { CmsFieldType, CollectionField } from "@/lib/types";

export type Editing = { id: string; data: Record<string, unknown> } | null;

export type CmsTab = "fields" | "items" | "detail";

type ConfirmFn = (options: {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}) => Promise<boolean>;

// Close the modal when its collection has been deleted from under it.
export function closeIfMissing(collection: unknown, onClose: () => void): void {
  if (!collection) onClose();
}

// PUT a collection patch, then refresh — toggling the busy flag around it.
export async function runPatchCollection(
  collectionId: string,
  body: Record<string, unknown>,
  setBusy: (b: boolean) => void,
  refresh: () => Promise<void>,
): Promise<void> {
  setBusy(true);
  try {
    await api.put(endpoints.collections.byId(collectionId), body);
    await refresh();
  } finally {
    setBusy(false);
  }
}

// The next fields array after appending a field built from the draft inputs.
export function buildAddedFields(
  fields: CollectionField[],
  newLabel: string,
  newType: CmsFieldType,
): CollectionField[] {
  const label = newLabel.trim() || "New field";
  const key = uniqueFieldKey(
    label,
    fields.map((f) => f.key),
  );
  return [...fields, { key, label, type: newType }];
}

export async function runAddItem(
  collectionId: string,
  fields: CollectionField[],
  setBusy: (b: boolean) => void,
  setEditing: (e: Editing) => void,
  setTab: (t: CmsTab) => void,
  refresh: () => Promise<void>,
): Promise<void> {
  setBusy(true);
  try {
    const { data: item } = await api.post(endpoints.collections.items(collectionId), {
      data: blankItemData(fields),
    });
    await refresh();
    setTab("items");
    setEditing({ id: item.id, data: item.data ?? {} });
  } finally {
    setBusy(false);
  }
}

export async function runSaveItem(
  collectionId: string,
  editing: Editing,
  setBusy: (b: boolean) => void,
  setEditing: (e: Editing) => void,
  refresh: () => Promise<void>,
): Promise<void> {
  if (!editing) return;
  setBusy(true);
  try {
    await api.put(endpoints.collections.item(collectionId, editing.id), {
      data: editing.data,
    });
    await refresh();
    setEditing(null);
  } finally {
    setBusy(false);
  }
}

export async function runDeleteItem(
  collectionId: string,
  itemId: string,
  editing: Editing,
  setBusy: (b: boolean) => void,
  setEditing: (e: Editing) => void,
  refresh: () => Promise<void>,
): Promise<void> {
  setBusy(true);
  try {
    await api.delete(endpoints.collections.item(collectionId, itemId));
    await refresh();
    if (editing?.id === itemId) setEditing(null);
  } finally {
    setBusy(false);
  }
}

export async function runDeleteCollection(
  collectionId: string,
  collectionName: string,
  confirm: ConfirmFn,
  setBusy: (b: boolean) => void,
  refresh: () => Promise<void>,
  onClose: () => void,
): Promise<void> {
  const ok = await confirm({
    title: "Delete collection?",
    message: `"${collectionName}" and all of its items will be permanently deleted.`,
    confirmLabel: "Delete collection",
    destructive: true,
  });
  if (!ok) return;
  setBusy(true);
  await api.delete(endpoints.collections.byId(collectionId));
  await refresh();
  onClose();
}
