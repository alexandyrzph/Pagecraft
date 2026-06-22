"use client";

import { type CSSProperties } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { useDesignSystem } from "@/store/design-system";
import {
  Field,
  TextInput,
  ColorInput,
  UnitInput,
  SelectInput,
  inputCls,
} from "@/components/editor/controls";
import { Button } from "@/components/ui/Button";
import type { StyleProps, TextStyle } from "@/lib/types";

type DesignSystem = ReturnType<typeof useDesignSystem.getState>;

const WEIGHTS = ["300", "400", "500", "600", "700", "800"].map((w) => ({ value: w, label: w }));
const ALIGN = ["left", "center", "right"].map((a) => ({ value: a, label: a }));
const TRANSFORM = [
  { value: "none", label: "none" },
  { value: "uppercase", label: "UPPER" },
  { value: "capitalize", label: "Title" },
  { value: "lowercase", label: "lower" },
];

export function ColorStylesSection({ ds }: { ds: DesignSystem }) {
  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Color styles</h2>
        <Button
          variant="neutral"
          size="sm"
          onPress={() => ds.addColor()}
          leadingIcon={<Plus size={14} />}
        >
          Add color
        </Button>
      </div>
      {ds.colors.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">
          No color styles yet. Add one to reuse it everywhere.
        </p>
      ) : (
        <div className="space-y-2">
          {ds.colors.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-100 p-2.5"
            >
              <div
                className="h-8 w-8 shrink-0 rounded-lg border border-zinc-200"
                style={{ background: c.value }}
              />
              <input
                className={inputCls + " max-w-[180px]"}
                value={c.name}
                onChange={(e) => ds.updateColor(c.id, { name: e.target.value })}
                placeholder="Name"
              />
              <div className="w-40">
                <ColorInput
                  value={c.value}
                  onChange={(v) => ds.updateColor(c.id, { value: v })}
                  hideTokens
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${c.name}`}
                onPress={() => ds.removeColor(c.id)}
                className="ml-auto text-fg-subtle hover:bg-danger-50 hover:text-danger-500"
              >
                <Trash2 size={15} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function TextStylesSection({ ds }: { ds: DesignSystem }) {
  return (
    <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Text styles</h2>
        <Button
          variant="neutral"
          size="sm"
          onPress={() => ds.addTextStyle("New style")}
          leadingIcon={<Plus size={14} />}
        >
          Add style
        </Button>
      </div>
      {ds.textStyles.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">
          No text styles yet. Define headings, body, captions once and reuse them.
        </p>
      ) : (
        <div className="space-y-4">
          {ds.textStyles.map((t) => (
            <TextStyleEditor key={t.id} ds={ds} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}

function TextStyleEditor({ ds, t }: { ds: DesignSystem; t: TextStyle }) {
  const p = t.props as StyleProps;
  const set = (k: keyof StyleProps, v: string) => ds.updateTextStyleProp(t.id, k, v);
  return (
    <div className="rounded-xl border border-zinc-100 p-4">
      <div className="mb-3 flex items-center gap-3">
        <input
          className={inputCls + " max-w-[220px] font-medium"}
          value={t.name}
          onChange={(e) => ds.updateTextStyle(t.id, { name: e.target.value })}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${t.name}`}
          onPress={() => ds.removeTextStyle(t.id)}
          className="ml-auto text-fg-subtle hover:bg-danger-50 hover:text-danger-500"
        >
          <Trash2 size={15} />
        </Button>
      </div>
      <div
        className="mb-3 rounded-lg bg-zinc-50 px-3 py-2.5"
        style={{
          color: p.color,
          fontSize: p.fontSize,
          fontWeight: p.fontWeight as CSSProperties["fontWeight"],
          lineHeight: p.lineHeight,
          letterSpacing: p.letterSpacing,
          textAlign: p.textAlign as CSSProperties["textAlign"],
          textTransform: p.textTransform as CSSProperties["textTransform"],
        }}
      >
        The quick brown fox
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Size">
          <UnitInput
            value={p.fontSize || ""}
            onChange={(v: string) => set("fontSize", v)}
            units={["px", "rem", "em"]}
            placeholder="16px"
          />
        </Field>
        <Field label="Weight">
          <SelectInput
            value={String(p.fontWeight || "400")}
            onChange={(v: string) => set("fontWeight", v)}
            options={WEIGHTS}
          />
        </Field>
        <Field label="Line height">
          <TextInput
            value={p.lineHeight || ""}
            onChange={(v: string) => set("lineHeight", v)}
            placeholder="1.4"
          />
        </Field>
        <Field label="Letter spacing">
          <UnitInput
            value={p.letterSpacing || ""}
            onChange={(v: string) => set("letterSpacing", v)}
            units={["px", "em"]}
            placeholder="0"
          />
        </Field>
        <Field label="Align">
          <SelectInput
            value={p.textAlign || "left"}
            onChange={(v: string) => set("textAlign", v)}
            options={ALIGN}
          />
        </Field>
        <Field label="Transform">
          <SelectInput
            value={p.textTransform || "none"}
            onChange={(v: string) => set("textTransform", v)}
            options={TRANSFORM}
          />
        </Field>
        <Field label="Color">
          <ColorInput value={p.color || ""} onChange={(v: string) => set("color", v)} />
        </Field>
      </div>
    </div>
  );
}
