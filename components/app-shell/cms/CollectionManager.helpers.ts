"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useConfirm, useAlert } from "@/components/ui/dialog-provider";
import { uniqueFieldKey, blankItemData } from "@/lib/cms/cms";
import type { CollectionData, CollectionItem } from "@/lib/types";

export type CollectionTab = "items" | "fields" | "settings";

export function useCollectionManager(initial: CollectionData) {
  const router = useRouter();
  const confirm = useConfirm();
  const alert = useAlert();
  const [col, setCol] = useState<CollectionData>(initial);
  const [tab, setTab] = useState<CollectionTab>("items");
  const [editing, setEditing] = useState<CollectionItem | null>(null);
  const [busy, setBusy] = useState(false);

  async function patchCollection(
    patch: Partial<Pick<CollectionData, "name" | "fields" | "detailEnabled">>,
  ) {
    const next = { ...col, ...patch };
    setCol(next);
    await api.put(endpoints.collections.byId(col.id), patch).catch(() => {});
  }

  async function reloadItems() {
    const r = await api
      .get(endpoints.collections.items(col.id))
      .then((x) => x.data)
      .catch(() => null);
    if (Array.isArray(r)) setCol((c) => ({ ...c, items: r }));
  }

  async function addItem() {
    setBusy(true);
    try {
      await api
        .post(endpoints.collections.items(col.id), { data: blankItemData(col.fields) })
        .catch(() => {});
      await reloadItems();
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(item: CollectionItem) {
    await api.put(endpoints.collections.item(col.id, item.id), { data: item.data }).catch(() => {});
    await reloadItems();
    setEditing(null);
  }

  async function deleteItem(id: string) {
    const ok = await confirm({
      title: "Delete item?",
      message: "This item will be permanently removed from the collection.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await api.delete(endpoints.collections.item(col.id, id)).catch(() => {});
    await reloadItems();
  }

  async function addField(label: string) {
    const key = uniqueFieldKey(
      label,
      col.fields.map((f) => f.key),
    );
    await patchCollection({ fields: [...col.fields, { key, label, type: "text" }] });
  }

  async function deleteCollection() {
    const ok = await confirm({
      title: "Delete collection?",
      message: `"${col.name}" and all of its items will be permanently deleted.`,
      confirmLabel: "Delete collection",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(endpoints.collections.byId(col.id));
      router.push("/cms");
      router.refresh();
    } catch (e) {
      const d = (axios.isAxiosError(e) ? e.response?.data : null) ?? {};
      await alert({ title: "Couldn't delete collection", message: d.error || "Please try again." });
    }
  }

  return {
    col,
    setCol,
    tab,
    setTab,
    editing,
    setEditing,
    busy,
    patchCollection,
    addItem,
    saveItem,
    deleteItem,
    addField,
    deleteCollection,
  };
}
