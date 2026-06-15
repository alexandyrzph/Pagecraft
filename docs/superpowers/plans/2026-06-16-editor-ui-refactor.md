# Editor UI Refactor (Verifiable Slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the three highest-duplication, data-shaped seams in the editor — the modal backdrop boilerplate, the three divergent field-input switches, and the hardcoded style-group switch — by extracting one shared `<Modal>`, one `LEAF_INPUTS` field-renderer map, and one `STYLE_GROUP_SCHEMAS` config, each behavior-preserving.

**Architecture:** Three small modules — `components/editor/Modal.tsx` (backdrop + spring dialog shell), `lib/field-inputs.tsx` (`LEAF_INPUTS` map + the moved `ItemsEditor`), and `lib/style-groups.tsx` (`STYLE_GROUP_SCHEMAS` data) — then rewire the existing consumers onto them. The data modules get runtime integrity tests (vitest, node env); the pure-UI rewires are verified by `tsc` + `build`.

**Tech Stack:** Next.js 16, React 19, framer-motion, zustand, Tailwind v4, Vitest 4 (node env), TypeScript 5.

---

> ⚠️ **Scope boundary (chosen deliberately):** this plan is the *verifiable, low-risk* slice of the larger editor refactor. It does **NOT** split `Inspector.tsx` (888 LOC) into multiple files, extract `EditorClient.tsx` hooks, consolidate the `editor-store.viewport` / `breakpoints.activeId` overlap, or touch the `FloatingInspector` re-render path. Those are deferred to a later plan, ideally after a React component-test harness exists.

> **Verification reality:** there is **no React component-test harness** — Vitest runs in `node` env and `@testing-library/react` is not installed. So:
> - **Tasks 2 & 4** add runtime *integrity* tests (the map/config covers every field-type / style-group) — real TDD.
> - **Tasks 1 & 3** are pure UI rewires verified by `npx tsc --noEmit` + `npm run build` + a manual editor smoke-check. There is no automated behavior test for them; this is called out per task.
> - These refactors must be **behavior-preserving**. Where a micro-difference is unavoidable (one modal's spring constants), it is documented inline as acceptable.

> **Every commit** ends with the trailer:
> `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

> **Branch first** — the repo is on `main` (Plan 1 already merged). Start with: `git switch -c refactor/editor-ui`.

> **`tsconfig` may flag unused imports.** After each rewrite, removing a switch/component leaves dangling imports. Run `npx tsc --noEmit` and delete whatever it reports as unused in the files you touched. This is expected cleanup, not scope creep.

---

## File Structure

| File | Responsibility | Task |
|------|----------------|------|
| `components/editor/Modal.tsx` | Shared modal backdrop + spring dialog shell (`open`, `onClose`, `className`, `children`) | 1 |
| `components/editor/SaveComponentModal.tsx` | Rewired to use `<Modal>` (keeps its own inner form) | 1 |
| `components/editor/UnsavedModal.tsx` | Rewired to use `<Modal>` | 1 |
| `components/editor/CmsManagerModal.tsx` | Outer shell rewired to use `<Modal>` (Task 1); `ItemFieldInput` rewired to `LEAF_INPUTS` (Task 3) | 1, 3 |
| `lib/field-inputs.tsx` | `LEAF_INPUTS` (type→renderer) + `ItemsEditor` (moved from `controls.tsx`) | 2 |
| `lib/types.ts` | Add runtime `FIELD_TYPES` and `STYLE_GROUPS` arrays | 2, 4 |
| `components/editor/controls.tsx` | `ItemsEditor` removed (moved to `field-inputs.tsx`) | 2 |
| `components/editor/Inspector.tsx` | `ContentField` → `LEAF_INPUTS` (Task 2); `StyleGroupView` → `STYLE_GROUP_SCHEMAS` (Task 4) | 2, 4 |
| `lib/style-groups.tsx` | `STYLE_GROUP_SCHEMAS` config + control-kind types + select-option constants | 4 |
| `tests/field-inputs.test.ts`, `tests/style-groups.test.ts` | Integrity tests | 2, 4 |

---

## Task 1: Shared `<Modal>` component

`SaveComponentModal`, `UnsavedModal`, and `CmsManagerModal` each hand-roll the identical backdrop (`fixed inset-0 z-[70] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm`, fade in/out, `onClick`=close) and a spring-animated white dialog. Extract that shell.

> **No unit test** (UI). Verify: `npx tsc --noEmit` + `npm run build` + manual smoke-check.
> **Behavior note:** the dialog animation is unified to `scale: 0.96, y: 8`, spring `stiffness: 440, damping: 32`. `SaveComponentModal`/`UnsavedModal` already use exactly this. `CmsManagerModal` previously used `scale: 0.97, y: 10`, spring `420/32` — a visually imperceptible change, accepted to keep one shell.

**Files:**
- Create: `components/editor/Modal.tsx`
- Modify: `components/editor/SaveComponentModal.tsx`, `components/editor/UnsavedModal.tsx`, `components/editor/CmsManagerModal.tsx`

- [ ] **Step 1: Create `components/editor/Modal.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Shared modal shell: a fade-in backdrop (click to dismiss) wrapping a
 * spring-animated white dialog. Owns ONLY the chrome — callers provide the
 * inner content and size/padding via `className`. `open` defaults to true so
 * parents that conditionally mount the modal can omit it.
 */
export function Modal({
  open = true,
  onClose,
  className,
  children,
}: {
  open?: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
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
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 440, damping: 32 }}
            className={cn("w-full rounded-2xl bg-white shadow-2xl ring-1 ring-black/10", className)}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Rewire `components/editor/SaveComponentModal.tsx`**

Replace the `import { AnimatePresence, motion } from "framer-motion";` line with `import { Modal } from "./Modal";`, and replace the entire `return (...)` JSX (the `<AnimatePresence>…</AnimatePresence>` block) with:

```tsx
  return (
    <Modal open={open} onClose={onCancel} className="max-w-sm p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <ComponentIcon size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">Save as component</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Reuse this across pages. Editing the component updates every instance.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-[11px] font-medium text-zinc-500">Component name</label>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="e.g. Site header"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!name.trim() || saving}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-violet-700 disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save component
        </button>
      </div>
    </Modal>
  );
```

(`Loader2` and `ComponentIcon` imports stay. Drop `AnimatePresence, motion`.)

- [ ] **Step 3: Rewire `components/editor/UnsavedModal.tsx`**

Replace `import { AnimatePresence, motion } from "framer-motion";` with `import { Modal } from "./Modal";`, and replace the `return (...)` with:

```tsx
  return (
    <Modal open={open} onClose={onCancel} className="max-w-sm p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
          <TriangleAlert size={18} />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">Unsaved changes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            You have unsaved changes on this page. Save them before leaving?
          </p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
        >
          Cancel
        </button>
        <button
          onClick={onDiscard}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          Discard
        </button>
        <button
          onClick={onSave}
          className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-zinc-800"
        >
          Save &amp; continue
        </button>
      </div>
    </Modal>
  );
```

(`TriangleAlert` import stays. Drop `AnimatePresence, motion`.)

- [ ] **Step 4: Rewire `components/editor/CmsManagerModal.tsx` outer shell**

Replace `import { AnimatePresence, motion } from "framer-motion";` with `import { Modal } from "./Modal";`. Then replace the outer `return ( <AnimatePresence> <motion.div …backdrop…> <motion.div …dialog…> … </motion.div> </motion.div> </AnimatePresence> );` so the dialog's existing children (the header `div`, the tabs `div`, and the `<div className="min-h-0 flex-1 overflow-y-auto p-5">…</div>`) become the children of `<Modal>`:

```tsx
  return (
    <Modal onClose={onClose} className="flex max-h-[86vh] max-w-2xl flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-3.5">
        {/* …unchanged header contents… */}
      </div>

      {/* tabs */}
      <div className="flex shrink-0 gap-1 border-b border-zinc-200 px-3 py-2">
        {/* …unchanged tabs contents… */}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {/* …unchanged body (FieldsTab / ItemsTab / DetailTab)… */}
      </div>
    </Modal>
  );
```

Keep the three inner blocks exactly as they are today — only the outer `<AnimatePresence>` + two `<motion.div>` wrappers are replaced by `<Modal onClose={onClose} className="flex max-h-[86vh] max-w-2xl flex-col overflow-hidden">`. (`onClose` keeps backdrop-dismiss; the dialog stop-propagation is now handled inside `Modal`.) Drop the `AnimatePresence, motion` import.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. (Fix any "unused import" errors in the three modal files by deleting the dangling `AnimatePresence`/`motion` import.)

Run: `npm test`
Expected: existing suite still green (89 tests).

Run: `npm run build`
Expected: build succeeds.

Manual smoke (in `npm run dev`, logged in): open the editor → select a block → "Save as component" modal appears, animates, dismisses on backdrop click and on Save; trigger the unsaved-changes modal (edit then navigate away) → appears with Cancel/Discard/Save; open the CMS manager (a Collection List block / CMS panel) → modal opens, tabs work, backdrop closes it.

- [ ] **Step 6: Commit**

```bash
git add components/editor/Modal.tsx components/editor/SaveComponentModal.tsx components/editor/UnsavedModal.tsx components/editor/CmsManagerModal.tsx
git commit -m "refactor(editor): extract shared Modal shell

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `LEAF_INPUTS` field-input map + move `ItemsEditor`

Three switches render a control for a field type: `ContentField` (`Inspector.tsx`), `ItemsEditor`'s sub-fields (`controls.tsx`), and `ItemFieldInput` (`CmsManagerModal.tsx`, done in Task 3). Unify the leaf renderers into one map. Because `ItemsEditor` lives in `controls.tsx` and the map will import the control components from `controls.tsx`, **move `ItemsEditor` into the new `field-inputs.tsx`** to avoid an import cycle (`field-inputs` → `controls`, one direction only).

> **Behavior-preserving.** Registry `itemFields` only use `icon/text/textarea/boolean/select` — all rendered identically by `LEAF_INPUTS`. `ContentField`'s `"code"` (bespoke monospace textarea) and `"items"` (recursive) cases are preserved: `code` is a map entry; `items` stays handled by the consumer.

**Files:**
- Modify: `lib/types.ts` (add `FIELD_TYPES`)
- Create: `lib/field-inputs.tsx`
- Test: `tests/field-inputs.test.ts`
- Modify: `components/editor/controls.tsx` (remove `ItemsEditor`)
- Modify: `components/editor/Inspector.tsx` (`ContentField` → `LEAF_INPUTS`; import `ItemsEditor` from new module)

- [ ] **Step 1: Add a runtime field-type list to `lib/types.ts`**

Directly after the `export type FieldType = … | "items";` declaration (currently ends ~line 156), add:

```ts
/** Runtime list of every FieldType (keep in sync with the FieldType union). */
export const FIELD_TYPES: FieldType[] = [
  "text",
  "textarea",
  "code",
  "number",
  "select",
  "color",
  "image",
  "url",
  "boolean",
  "icon",
  "file",
  "stringlist",
  "items",
];
```

- [ ] **Step 2: Write the failing integrity test** — `tests/field-inputs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { LEAF_INPUTS } from "@/lib/field-inputs";
import { FIELD_TYPES } from "@/lib/types";

// The CMS field-type set (CmsFieldType) that CmsManagerModal renders.
const CMS_TYPES = ["text", "textarea", "image", "url", "number", "date", "boolean"] as const;

describe("LEAF_INPUTS", () => {
  it("has a renderer for every inspector field type except 'items'", () => {
    for (const t of FIELD_TYPES) {
      if (t === "items") continue;
      expect(typeof LEAF_INPUTS[t]).toBe("function");
    }
  });

  it("does NOT handle 'items' (recursive — handled by the consumer)", () => {
    expect(LEAF_INPUTS.items).toBeUndefined();
  });

  it("has a renderer for every CMS field type", () => {
    for (const t of CMS_TYPES) {
      expect(typeof LEAF_INPUTS[t]).toBe("function");
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/field-inputs.test.ts`
Expected: FAIL — cannot find module `@/lib/field-inputs`.

> If, once the module exists (Step 4), this test fails to *import* because a transitive dependency touches `window`/`document` at module load, add `// @vitest-environment jsdom` as the very first line of `tests/field-inputs.test.ts` (jsdom is already a devDependency). It should not be necessary — `controls.tsx` has no top-level browser calls — but this is the sanctioned fallback.

- [ ] **Step 4: Create `lib/field-inputs.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ColorInput,
  Field,
  FileInput,
  IconPicker,
  ImageInput,
  NumberInput,
  SelectInput,
  StringList,
  TextArea,
  TextInput,
  Toggle,
  inputCls,
} from "@/components/editor/controls";
import type { SelectOption, SettingField } from "@/lib/types";

export type FieldInputProps = {
  value: any;
  onChange: (v: any) => void;
  options?: SelectOption[];
  placeholder?: string;
};

const textInput = ({ value, onChange, placeholder }: FieldInputProps) => (
  <TextInput value={value ?? ""} onChange={onChange} placeholder={placeholder} />
);

/**
 * Leaf (non-recursive) field renderers keyed by field-type string. Shared by the
 * inspector content fields, the items-editor sub-fields, and the CMS item editor.
 * The recursive "items" type is intentionally absent — its consumer renders
 * <ItemsEditor/> directly.
 */
export const LEAF_INPUTS: Record<string, (p: FieldInputProps) => ReactNode> = {
  text: textInput,
  url: textInput,
  textarea: ({ value, onChange, placeholder }) => (
    <TextArea value={value ?? ""} onChange={onChange} placeholder={placeholder} />
  ),
  code: ({ value, onChange, placeholder }) => (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={6}
      spellCheck={false}
      className="w-full resize-y rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-800 shadow-xs outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
    />
  ),
  number: ({ value, onChange, placeholder }) => (
    <NumberInput value={value ?? ""} onChange={onChange} placeholder={placeholder} />
  ),
  select: ({ value, onChange, options }) => (
    <SelectInput value={String(value ?? "")} onChange={onChange} options={options ?? []} />
  ),
  color: ({ value, onChange }) => <ColorInput value={value ?? ""} onChange={onChange} />,
  boolean: ({ value, onChange }) => <Toggle value={!!value} onChange={onChange} />,
  icon: ({ value, onChange }) => <IconPicker value={value ?? "Star"} onChange={onChange} />,
  image: ({ value, onChange }) => <ImageInput value={value ?? ""} onChange={onChange} />,
  file: ({ value, onChange }) => <FileInput value={value ?? ""} onChange={onChange} />,
  stringlist: ({ value, onChange }) => <StringList value={value ?? []} onChange={onChange} />,
  date: ({ value, onChange }) => (
    <input
      type="date"
      className={inputCls}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
};

/** Repeatable list of {key: value} items, each edited via its sub-field schema. */
export function ItemsEditor({
  value,
  itemFields,
  onChange,
}: {
  value: Record<string, any>[];
  itemFields: NonNullable<SettingField["itemFields"]>;
  onChange: (v: Record<string, any>[]) => void;
}) {
  const items = value ?? [];

  const blank = () => {
    const o: Record<string, any> = {};
    for (const f of itemFields) {
      o[f.key] = f.type === "boolean" ? false : f.type === "icon" ? "Star" : "";
    }
    return o;
  };

  const update = (i: number, key: string, v: any) => {
    const next = items.map((it, j) => (j === i ? { ...it, [key]: v } : it));
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Item {i + 1}
            </span>
            <button
              type="button"
              className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 size={13} />
            </button>
          </div>
          <div className="space-y-2">
            {itemFields.map((f) => (
              <Field key={f.key} label={f.label}>
                {(LEAF_INPUTS[f.type] ?? LEAF_INPUTS.text)({
                  value: item[f.key],
                  onChange: (v) => update(i, f.key, v),
                  options: f.options,
                })}
              </Field>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, blank()])}
        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
      >
        <Plus size={13} /> Add item
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/field-inputs.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Remove `ItemsEditor` from `components/editor/controls.tsx`**

Delete the entire `export function ItemsEditor(…) { … }` block (currently ~lines 645–713). Leave the rest of `controls.tsx` unchanged (`Field`, `inputCls`, and all other inputs stay — they're imported by `field-inputs.tsx` and others).

- [ ] **Step 7: Rewire `ContentField` and imports in `components/editor/Inspector.tsx`**

In the import block, remove `ItemsEditor` from the `from "./controls"` import list, and add a new import:

```tsx
import { ItemsEditor, LEAF_INPUTS } from "@/lib/field-inputs";
```

Then replace the entire `ContentField` function (currently ~lines 446–495) with:

```tsx
function ContentField({
  field,
  blockId,
  value,
}: {
  field: SettingField;
  blockId: string;
  value: any;
}) {
  const setProp = useEditor((s) => s.setProp);
  const set = (v: any) => setProp(blockId, field.key, v);

  if (field.type === "items") {
    return (
      <Field label={field.label}>
        <ItemsEditor value={value ?? []} itemFields={field.itemFields ?? []} onChange={set} />
      </Field>
    );
  }

  const render = LEAF_INPUTS[field.type] ?? LEAF_INPUTS.text;
  return (
    <Field label={field.label}>
      {render({ value, onChange: set, options: field.options, placeholder: field.placeholder })}
    </Field>
  );
}
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. Fix any unused-import errors that surface in `controls.tsx` (e.g. lucide icons only `ItemsEditor` used — but `Plus`/`Trash2` are also used by `StringList`, so likely none) or `Inspector.tsx`.

Run: `grep -rn "ItemsEditor" components app lib | grep -v "lib/field-inputs"` — confirm the only remaining references are the import + usage in `Inspector.tsx` (no other file still imports it from `./controls`). If another importer exists, repoint it to `@/lib/field-inputs`.

Run: `npm test`
Expected: all pass (89 prior + 3 new = 92).

Run: `npm run build`
Expected: succeeds.

Manual smoke: select blocks of varied types (heading=text, text=textarea, button=text+url, image=image, icon=icon, features/pricing=items, code/embed=code, footer=stringlist) → every content field renders and edits exactly as before; the Features/Pricing items editor adds/edits/removes items.

- [ ] **Step 9: Commit**

```bash
git add lib/types.ts lib/field-inputs.tsx tests/field-inputs.test.ts components/editor/controls.tsx components/editor/Inspector.tsx
git commit -m "refactor(editor): unify field inputs into LEAF_INPUTS map

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Rewire `CmsManagerModal` `ItemFieldInput` to `LEAF_INPUTS`

The CMS item editor has its own field switch over `CmsFieldType` (`text/textarea/image/url/number/date/boolean`). Route it through `LEAF_INPUTS` — all those types exist in the map and render identically.

> **No unit test** (UI). Verify: `tsc` + `build` + manual. **Behavior-preserving:** `url` keeps its `"https://…"` placeholder (passed explicitly); every other type maps 1:1.

**Files:**
- Modify: `components/editor/CmsManagerModal.tsx`

- [ ] **Step 1: Replace `ItemFieldInput`**

Replace the entire `function ItemFieldInput(…) { switch (field.type) { … } }` (currently ~lines 446–476) with:

```tsx
function ItemFieldInput({
  field,
  value,
  onChange,
}: {
  field: CollectionField;
  value: any;
  onChange: (v: any) => void;
}) {
  const render = LEAF_INPUTS[field.type] ?? LEAF_INPUTS.text;
  return <>{render({ value, onChange, placeholder: field.type === "url" ? "https://…" : undefined })}</>;
}
```

- [ ] **Step 2: Update imports**

Add `import { LEAF_INPUTS } from "@/lib/field-inputs";`. Then run `npx tsc --noEmit` and remove from the `from "./controls"` import only the names that are now unused (`ImageInput`, `NumberInput`, `TextArea`, `TextInput` were used solely by the old `ItemFieldInput`). **Keep** `SelectInput`, `Toggle`, and `inputCls` — they're still used by `FieldsTab`/`DetailTab`. Let `tsc` confirm exactly which are unused.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → no errors.
Run: `npm test` → all pass (92).
Run: `npm run build` → succeeds.
Manual smoke: open the CMS manager → Items tab → edit an item with each field type (text/textarea/image/url/number/date/boolean) → each input renders and saves; the `url` field shows the `https://…` placeholder.

- [ ] **Step 4: Commit**

```bash
git add components/editor/CmsManagerModal.tsx
git commit -m "refactor(editor): route CMS item editor through LEAF_INPUTS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `STYLE_GROUP_SCHEMAS` data-driven style groups

`StyleGroupView` in `Inspector.tsx` is a 6-case switch (`typography/spacing/background/border/effects/layout`), each emitting a `<Section>` of style controls. Move the *what* (which controls, in which layout) into a data config in `lib/style-groups.tsx`, and reduce the switch to a generic renderer. The control kinds (`SUnit`/`SColor`/`SSelect`/`SSegment`/`SOpacity`/`SpacingControl`/`SText`) and `Section` stay in `Inspector.tsx`.

> **Behavior-preserving.** Same titles, same `defaultOpen` flags (typography & spacing open; background/border/effects/layout collapsed), same grid-of-2 pairings, same control props/options.

**Files:**
- Modify: `lib/types.ts` (add `STYLE_GROUPS`)
- Create: `lib/style-groups.tsx`
- Test: `tests/style-groups.test.ts`
- Modify: `components/editor/Inspector.tsx` (replace `StyleGroupView` + move the option constants out)

- [ ] **Step 1: Add a runtime style-group list to `lib/types.ts`**

Directly after the `export type StyleGroup = … | "layout";` declaration (end of file), add:

```ts
/** Runtime list of every StyleGroup (keep in sync with the StyleGroup union). */
export const STYLE_GROUPS: StyleGroup[] = [
  "typography",
  "spacing",
  "background",
  "border",
  "effects",
  "layout",
];
```

- [ ] **Step 2: Write the failing integrity test** — `tests/style-groups.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { STYLE_GROUP_SCHEMAS } from "@/lib/style-groups";
import { STYLE_GROUPS } from "@/lib/types";

const KNOWN_CONTROLS = ["unit", "text", "color", "select", "segment", "spacing", "opacity"];

describe("STYLE_GROUP_SCHEMAS", () => {
  it("has a schema for every style group", () => {
    for (const g of STYLE_GROUPS) {
      expect(STYLE_GROUP_SCHEMAS[g], `missing schema for ${g}`).toBeDefined();
    }
  });

  it("every schema has a non-empty title and at least one row", () => {
    for (const g of STYLE_GROUPS) {
      const s = STYLE_GROUP_SCHEMAS[g];
      expect(typeof s.title).toBe("string");
      expect(s.title.length).toBeGreaterThan(0);
      expect(Array.isArray(s.rows)).toBe(true);
      expect(s.rows.length).toBeGreaterThan(0);
    }
  });

  it("every row has 1 or 2 fields, each with a known control kind", () => {
    for (const g of STYLE_GROUPS) {
      for (const row of STYLE_GROUP_SCHEMAS[g].rows) {
        expect(row.length === 1 || row.length === 2).toBe(true);
        for (const field of row) {
          expect(KNOWN_CONTROLS).toContain(field.control);
        }
      }
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/style-groups.test.ts`
Expected: FAIL — cannot find module `@/lib/style-groups`.

- [ ] **Step 4: Create `lib/style-groups.tsx`**

```tsx
import type { ReactNode } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from "lucide-react";
import type { SelectOption, StyleGroup, StyleProps } from "./types";

// --- option constants (moved out of Inspector.tsx) --------------------------

const FONT_WEIGHTS: SelectOption[] = [
  { label: "Default", value: "" },
  { label: "Light", value: "300" },
  { label: "Normal", value: "400" },
  { label: "Medium", value: "500" },
  { label: "Semibold", value: "600" },
  { label: "Bold", value: "700" },
  { label: "Extra bold", value: "800" },
];

const SHADOWS: SelectOption[] = [
  { label: "None", value: "" },
  { label: "Small", value: "0 1px 2px rgba(0,0,0,0.06)" },
  { label: "Medium", value: "0 4px 6px rgba(0,0,0,0.08)" },
  { label: "Large", value: "0 10px 20px rgba(0,0,0,0.12)" },
  { label: "X-Large", value: "0 20px 30px rgba(0,0,0,0.16)" },
];

const opt = (...vals: string[]): SelectOption[] => [
  { label: "Default", value: "" },
  ...vals.map((v) => ({ label: v, value: v })),
];

const ALIGN_SEG = [
  { value: "left", label: "Left", icon: <AlignLeft size={14} /> },
  { value: "center", label: "Center", icon: <AlignCenter size={14} /> },
  { value: "right", label: "Right", icon: <AlignRight size={14} /> },
  { value: "justify", label: "Justify", icon: <AlignJustify size={14} /> },
];

// --- schema types -----------------------------------------------------------

type K = keyof StyleProps;

export type StyleFieldDef =
  | { control: "unit"; label: string; k: K; units?: string[]; placeholder?: string }
  | { control: "text"; label: string; k: K; placeholder?: string }
  | { control: "color"; label: string; k: K }
  | { control: "select"; label: string; k: K; options: SelectOption[] }
  | { control: "segment"; label: string; k: K; options: { value: string; label: string; icon?: ReactNode }[] }
  | { control: "spacing"; label: string; keys: [K, K, K, K] }
  | { control: "opacity" };

export type StyleGroupSchema = {
  title: string;
  defaultOpen?: boolean;
  /** each row renders inline; a 2-field row becomes a 2-col grid */
  rows: StyleFieldDef[][];
};

// --- the config -------------------------------------------------------------

export const STYLE_GROUP_SCHEMAS: Record<StyleGroup, StyleGroupSchema> = {
  typography: {
    title: "Typography",
    rows: [
      [{ control: "unit", label: "Font size", k: "fontSize", units: ["px", "rem", "em"], placeholder: "16" }],
      [{ control: "select", label: "Weight", k: "fontWeight", options: FONT_WEIGHTS }],
      [{ control: "color", label: "Text color", k: "color" }],
      [
        { control: "unit", label: "Line height", k: "lineHeight", units: ["", "px", "rem"], placeholder: "1.5" },
        { control: "unit", label: "Letter spacing", k: "letterSpacing", units: ["px", "em"], placeholder: "0" },
      ],
      [{ control: "segment", label: "Align", k: "textAlign", options: ALIGN_SEG }],
      [{ control: "select", label: "Transform", k: "textTransform", options: opt("none", "uppercase", "capitalize", "lowercase") }],
    ],
  },
  spacing: {
    title: "Spacing",
    rows: [
      [{ control: "spacing", label: "Padding", keys: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] }],
      [{ control: "spacing", label: "Margin", keys: ["marginTop", "marginRight", "marginBottom", "marginLeft"] }],
    ],
  },
  background: {
    title: "Background",
    defaultOpen: false,
    rows: [
      [{ control: "color", label: "Background color", k: "backgroundColor" }],
      [{ control: "text", label: "Background image / gradient", k: "backgroundImage", placeholder: "url(…) or linear-gradient(…)" }],
    ],
  },
  border: {
    title: "Border",
    defaultOpen: false,
    rows: [
      [{ control: "unit", label: "Radius", k: "borderRadius", units: ["px", "%", "rem"], placeholder: "12" }],
      [
        { control: "unit", label: "Width", k: "borderWidth", units: ["px"], placeholder: "1" },
        { control: "select", label: "Style", k: "borderStyle", options: opt("solid", "dashed", "dotted", "none") },
      ],
      [{ control: "color", label: "Border color", k: "borderColor" }],
    ],
  },
  effects: {
    title: "Effects",
    defaultOpen: false,
    rows: [
      [{ control: "select", label: "Shadow", k: "boxShadow", options: SHADOWS }],
      [{ control: "opacity" }],
    ],
  },
  layout: {
    title: "Layout",
    defaultOpen: false,
    rows: [
      [
        { control: "unit", label: "Max width", k: "maxWidth", units: ["px", "%", "rem"], placeholder: "auto" },
        { control: "unit", label: "Min height", k: "minHeight", units: ["px", "vh", "rem", "auto"], placeholder: "auto" },
      ],
      [{ control: "select", label: "Display", k: "display", options: opt("block", "flex", "grid", "inline-block", "none") }],
      [
        { control: "select", label: "Align items", k: "alignItems", options: opt("flex-start", "center", "flex-end", "stretch") },
        { control: "select", label: "Justify", k: "justifyContent", options: opt("flex-start", "center", "flex-end", "space-between", "space-around") },
      ],
      [{ control: "unit", label: "Gap", k: "gap", units: ["px", "rem"], placeholder: "16" }],
    ],
  },
};
```

> **Type note:** `textTransform` and `borderStyle` etc. are typed on `StyleProps`; `textAlign` is a union. `k: keyof StyleProps` covers all keys used above. If `tsc` complains that an option `value: string` isn't assignable where `textAlign` expects its literal union, it won't — the schema only stores the key (`k`), and the actual `setStyle` call in `SSegment`/`SSelect` already accepts `string` (see `useStyleField`/`setStyle` signature `value: string`). No cast needed.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/style-groups.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Rewire `Inspector.tsx`**

(a) Delete the option constants now living in `style-groups.tsx` — remove `FONT_WEIGHTS`, `SHADOWS`, `opt`, and `ALIGN_SEG` from `Inspector.tsx` (currently ~lines 172–197). Keep `SRow`, `SUnit`, `SText`, `SColor`, `SSelect`, `SSegment`, `SOpacity`, `SpacingControl`, and `Section`.

(b) Add the import:

```tsx
import { STYLE_GROUP_SCHEMAS, type StyleFieldDef } from "@/lib/style-groups";
```

(c) Replace the entire `StyleGroupView` function (currently ~lines 199–263) with a generic renderer plus a control dispatcher:

```tsx
function StyleControl({ field }: { field: StyleFieldDef }) {
  switch (field.control) {
    case "unit":
      return <SUnit label={field.label} k={field.k} units={field.units} placeholder={field.placeholder} />;
    case "text":
      return <SText label={field.label} k={field.k} placeholder={field.placeholder} />;
    case "color":
      return <SColor label={field.label} k={field.k} />;
    case "select":
      return <SSelect label={field.label} k={field.k} options={field.options} />;
    case "segment":
      return <SSegment label={field.label} k={field.k} options={field.options} />;
    case "spacing":
      return <SpacingControl label={field.label} keys={field.keys} />;
    case "opacity":
      return <SOpacity />;
  }
}

function StyleGroupView({ group }: { group: StyleGroup }) {
  const schema = STYLE_GROUP_SCHEMAS[group];
  return (
    <Section title={schema.title} defaultOpen={schema.defaultOpen}>
      {schema.rows.map((row, i) =>
        row.length === 1 ? (
          <StyleControl key={i} field={row[0]} />
        ) : (
          <div key={i} className="grid grid-cols-2 gap-2">
            {row.map((f, j) => (
              <StyleControl key={j} field={f} />
            ))}
          </div>
        ),
      )}
    </Section>
  );
}
```

(The `StyleGroupView` call site at the bottom of `InspectorContent` — `def.styleGroups.map((g) => <StyleGroupView key={g} group={g} />)` — is unchanged.)

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` → no errors. (Fix any now-unused imports in `Inspector.tsx`, e.g. the `AlignLeft`/`AlignCenter`/`AlignRight`/`AlignJustify` lucide icons if they were only used by the removed `ALIGN_SEG` — confirm they aren't used elsewhere in `Inspector.tsx` before deleting.)

Run: `npm test` → all pass (92 prior + 3 new = 95).

Run: `npm run build` → succeeds.

Manual smoke: select a block → Style tab → each group (Typography, Spacing, Background, Border, Effects, Layout) renders with the same controls in the same layout (the 2-col pairs: line-height/letter-spacing, border width/style, max-width/min-height, align-items/justify); collapsed groups (Background/Border/Effects/Layout) start collapsed; editing each control still updates the canvas per breakpoint; reset dots and the spacing link toggle still work.

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts lib/style-groups.tsx tests/style-groups.test.ts components/editor/Inspector.tsx
git commit -m "refactor(editor): data-drive style groups via STYLE_GROUP_SCHEMAS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Checklist (run before declaring done)

- [ ] **Spec coverage:** shared `<Modal>` (Task 1, 3 modals rewired), `LEAF_INPUTS` map (Task 2, `ContentField` + `ItemsEditor`), CMS item editor on the map (Task 3), `STYLE_GROUP_SCHEMAS` data-driven groups (Task 4).
- [ ] **No import cycle:** `lib/field-inputs.tsx` imports from `controls.tsx` only (one direction). `ItemsEditor` no longer exists in `controls.tsx`. `grep -rn "ItemsEditor" components app lib` shows it defined only in `lib/field-inputs.tsx`.
- [ ] **Name consistency:** `Modal`, `LEAF_INPUTS`, `FieldInputProps`, `ItemsEditor`, `FIELD_TYPES`, `STYLE_GROUPS`, `STYLE_GROUP_SCHEMAS`, `StyleFieldDef`, `StyleGroupSchema`, `StyleControl`, `StyleGroupView` — used identically wherever referenced.
- [ ] **Behavior preserved:** modals look/animate the same (CmsManager spring micro-change accepted); every field type renders the same control; the `url` placeholder preserved in CMS; style groups identical (titles, collapse defaults, 2-col pairs, control options).
- [ ] `npx tsc --noEmit && npm test && npm run build` all green (95 tests).

---

## Deferred to a later plan (NOT in this slice)

- Split `Inspector.tsx` (still 888 LOC — these tasks net out roughly flat there: `ContentField`/`StyleGroupView` shrink, but the file is otherwise unchanged) into `InspectorPanel` / `InspectorContent` / `StyleInspector` / style-field components.
- Extract `useKeyboardShortcuts` / `useDragDropManager` / `usePersistence` from `EditorClient.tsx`.
- Consolidate the `editor-store.viewport` ↔ `breakpoints.activeId` overlap into one source of truth.
- Scope the `FloatingInspector` position recompute off the whole `tree` (`Inspector.tsx:798-800`).

These are higher-risk and weakly verifiable without a component-test harness; recommend adding `@testing-library/react` + a jsdom test env first.
