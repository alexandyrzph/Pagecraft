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
