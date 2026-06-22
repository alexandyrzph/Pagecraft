"use client";

import type { CollectionData } from "@/lib/types";
import { useCollectionManager } from "./CollectionManager.helpers";
import {
  CollectionHeader,
  CollectionTabs,
  ItemsTab,
  FieldsTab,
  SettingsTab,
  EditItemModal,
} from "./CollectionManager.parts";

export function CollectionManager({ initial }: { initial: CollectionData }) {
  const {
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
  } = useCollectionManager(initial);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <CollectionHeader col={col} />
      <CollectionTabs tab={tab} setTab={setTab} />

      <div className="py-6">
        {tab === "items" && (
          <ItemsTab
            col={col}
            busy={busy}
            addItem={addItem}
            setEditing={setEditing}
            deleteItem={deleteItem}
          />
        )}

        {tab === "fields" && (
          <FieldsTab
            col={col}
            setCol={setCol}
            patchCollection={patchCollection}
            addField={addField}
          />
        )}

        {tab === "settings" && (
          <SettingsTab
            col={col}
            setCol={setCol}
            patchCollection={patchCollection}
            deleteCollection={deleteCollection}
          />
        )}
      </div>

      <EditItemModal
        item={editing}
        fields={col.fields}
        onChange={setEditing}
        onCancel={() => setEditing(null)}
        onSave={saveItem}
      />
    </div>
  );
}
