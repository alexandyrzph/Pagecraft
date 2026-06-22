"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Field,
  TextInput,
  TextArea,
  NumberInput,
  SelectInput,
  ImageInput,
  Toggle,
  inputCls,
} from "@/components/editor/controls";
import { Table, TableContainer, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { CMS_FIELD_TYPES } from "@/lib/cms/cms";
import type { CollectionData, CollectionField, CollectionItem, CmsFieldType } from "@/lib/types";
import type { CollectionTab } from "./CollectionManager.helpers";

type CollectionPatch = Partial<Pick<CollectionData, "name" | "fields" | "detailEnabled">>;

function FieldValueInput({
  field,
  value,
  onChange,
}: {
  field: CollectionField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case "textarea":
      return <TextArea value={(value ?? "") as string} onChange={onChange} />;
    case "number":
      // NumberInput.onChange always emits number (empty input → 0); coerce at call site
      return (
        <NumberInput
          value={(value ?? "") as number | string}
          onChange={(v: number) => onChange(v)}
        />
      );
    case "boolean":
      return <Toggle value={!!value} onChange={onChange} />;
    case "image":
      return <ImageInput value={(value ?? "") as string} onChange={onChange} />;
    case "date":
      return (
        <input
          type="date"
          className={inputCls}
          value={(value ?? "") as string}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return <TextInput value={(value ?? "") as string} onChange={onChange} />;
  }
}

export function CollectionHeader({ col }: { col: CollectionData }) {
  return (
    <>
      <Link
        href="/cms"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft size={15} /> CMS
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{col.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        /{col.slug} · {col.items.length} item{col.items.length !== 1 ? "s" : ""}
      </p>
    </>
  );
}

export function CollectionTabs({
  tab,
  setTab,
}: {
  tab: CollectionTab;
  setTab: (t: CollectionTab) => void;
}) {
  return (
    <div className="mt-6 flex gap-1 border-b border-border">
      {(["items", "fields", "settings"] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`px-3 py-2 text-sm font-medium capitalize ${
            tab === t ? "border-b-2 border-brand-600 text-brand-700" : "text-fg-muted hover:text-fg"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function ItemsTab({
  col,
  busy,
  addItem,
  setEditing,
  deleteItem,
}: {
  col: CollectionData;
  busy: boolean;
  addItem: () => void;
  setEditing: (item: CollectionItem) => void;
  deleteItem: (id: string) => void;
}) {
  return (
    <div>
      <Button
        variant="neutral"
        className="mb-4"
        onPress={addItem}
        isLoading={busy}
        leadingIcon={<Plus size={15} />}
      >
        Add item
      </Button>
      {col.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-400">
          No items yet.
        </p>
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <tr>
                {col.fields.slice(0, 4).map((f) => (
                  <TH key={f.key}>{f.label}</TH>
                ))}
                <TH className="text-right">
                  <span className="sr-only">Actions</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {col.items.map((it) => (
                <TR key={it.id} className="group">
                  {col.fields.slice(0, 4).map((f, i) => (
                    <TD
                      key={f.key}
                      className={
                        i === 0
                          ? "max-w-[260px] truncate font-medium text-zinc-900"
                          : "max-w-[220px] truncate"
                      }
                      title={String(it.data?.[f.key] ?? "")}
                    >
                      {String(it.data?.[f.key] ?? "") || <span className="text-zinc-300">—</span>}
                    </TD>
                  ))}
                  <TD className="w-px whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => setEditing(it)}
                        className="text-brand-600 hover:bg-brand-50"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete item"
                        onPress={() => deleteItem(it.id)}
                        className="text-fg-subtle hover:bg-danger-50 hover:text-danger-500"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

export function FieldsTab({
  col,
  setCol,
  patchCollection,
  addField,
}: {
  col: CollectionData;
  setCol: React.Dispatch<React.SetStateAction<CollectionData>>;
  patchCollection: (patch: CollectionPatch) => Promise<void>;
  addField: (label: string) => void;
}) {
  return (
    <div className="space-y-3">
      {col.fields.map((f, i) => (
        <div
          key={f.key}
          className="flex items-center gap-3 rounded-xl border border-zinc-100 p-2.5"
        >
          <input
            className={inputCls + " max-w-[200px]"}
            value={f.label}
            onChange={(e) => {
              const fields = [...col.fields];
              fields[i] = { ...f, label: e.target.value };
              setCol({ ...col, fields });
            }}
            onBlur={() => patchCollection({ fields: col.fields })}
          />
          <div className="w-40">
            <SelectInput
              value={f.type}
              onChange={(v: string) => {
                const fields = [...col.fields];
                fields[i] = { ...f, type: v as CmsFieldType };
                patchCollection({ fields });
              }}
              options={CMS_FIELD_TYPES}
            />
          </div>
          <code className="text-xs text-zinc-400">{f.key}</code>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${f.label}`}
            onPress={() => patchCollection({ fields: col.fields.filter((x) => x.key !== f.key) })}
            className="ml-auto text-fg-subtle hover:bg-danger-50 hover:text-danger-500"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ))}
      <AddField onAdd={addField} />
    </div>
  );
}

export function SettingsTab({
  col,
  setCol,
  patchCollection,
  deleteCollection,
}: {
  col: CollectionData;
  setCol: React.Dispatch<React.SetStateAction<CollectionData>>;
  patchCollection: (patch: CollectionPatch) => Promise<void>;
  deleteCollection: () => void;
}) {
  return (
    <div className="max-w-sm space-y-5">
      <Field label="Collection name">
        <TextInput value={col.name} onChange={(v: string) => setCol({ ...col, name: v })} />
      </Field>
      <Button variant="neutral" onPress={() => patchCollection({ name: col.name })}>
        Save name
      </Button>
      <label className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
        <span className="text-sm text-zinc-700">Detail pages</span>
        <Toggle
          value={!!col.detailEnabled}
          onChange={(v: boolean) => patchCollection({ detailEnabled: v })}
        />
      </label>
      <Link
        href={`/collection/${col.id}/template`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        Edit detail template <ExternalLink size={14} />
      </Link>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-800">Delete collection</p>
        <Button
          variant="danger"
          className="mt-2"
          onPress={deleteCollection}
          leadingIcon={<Trash2 size={15} />}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

export function EditItemModal({
  item,
  fields,
  onChange,
  onCancel,
  onSave,
}: {
  item: CollectionItem | null;
  fields: CollectionField[];
  onChange: (item: CollectionItem) => void;
  onCancel: () => void;
  onSave: (item: CollectionItem) => void;
}) {
  // Retain the last item so content stays visible through the exit animation.
  const [last, setLast] = useState<CollectionItem | null>(item);
  if (item && item !== last) setLast(item);
  const view = item ?? last;

  return (
    <Modal open={!!item} onClose={onCancel} align="top" className="max-w-lg p-6">
      {view && (
        <>
          <h3 className="mb-4 text-sm font-bold text-zinc-900">Edit item</h3>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                <FieldValueInput
                  field={f}
                  value={view.data?.[f.key]}
                  onChange={(v) => onChange({ ...view, data: { ...view.data, [f.key]: v } })}
                />
              </Field>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onPress={onCancel}>
              Cancel
            </Button>
            <Button variant="neutral" onPress={() => onSave(view)}>
              Save
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function AddField({ onAdd }: { onAdd: (label: string) => void }) {
  const [label, setLabel] = useState("");
  return (
    <div className="flex gap-2">
      <input
        className={inputCls + " max-w-[240px]"}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="New field label"
        onKeyDown={(e) => {
          if (e.key === "Enter" && label.trim()) {
            onAdd(label.trim());
            setLabel("");
          }
        }}
      />
      <Button
        variant="secondary"
        leadingIcon={<Plus size={15} />}
        onPress={() => {
          if (label.trim()) {
            onAdd(label.trim());
            setLabel("");
          }
        }}
      >
        Add field
      </Button>
    </div>
  );
}
