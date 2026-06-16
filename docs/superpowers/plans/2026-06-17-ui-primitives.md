# UI Primitives (react-aria-components) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a reusable, accessible UI primitive library on `react-aria-components`, wired to a Tailwind v4 `@theme` token layer, and upgrade the existing Modal/dialog system to trap and restore focus — without losing the current framer-motion animation.

**Architecture:** Thin, `"use client"` wrappers in `components/ui/` compose `react-aria-components` for behavior/ARIA and Tailwind utilities (generated from semantic `@theme` tokens) for styling, combined via the existing `cn()` helper. The Modal keeps its framer-motion shell and gains focus management via `react-aria`'s `FocusScope`. This plan delivers Phases 0–2 of the design spec; the call-site migration (Phases 3–5) is a follow-up plan.

**Tech Stack:** Next 16, React 19, Tailwind v4 (`@theme`), `react-aria-components`, `react-aria` (`FocusScope`), framer-motion (retained), lucide-react, vitest + @testing-library/react + user-event (jsdom).

**Spec:** `docs/superpowers/specs/2026-06-17-ui-primitives-react-aria-design.md`

**Verification gate (run after every task):** `npx tsc --noEmit` and `npm test`. **Never run `next build`** — it clobbers the live dev server (shared `.next/`).

---

## File Structure

**Create:**
- `vitest.config.ts` — vitest config (jsdom env, react plugin, `@` alias, setup file)
- `vitest.setup.ts` — jest-dom matchers, `cleanup()`, `matchMedia`/`ResizeObserver` polyfills
- `components/ui/Button.tsx` — `Button` (variants/sizes/loading/icons)
- `components/ui/TextField.tsx` — labeled text input + error/description
- `components/ui/Textarea.tsx` — labeled multiline input
- `components/ui/Select.tsx` — accessible select (replaces native `<select>`)
- `components/ui/Menu.tsx` — action menu (`Menu`, `MenuItemRow`)
- `components/ui/Popover.tsx` — low-level styled popover box
- `components/ui/Checkbox.tsx` — `Checkbox`
- `components/ui/Switch.tsx` — `Switch` (replaces editor `Toggle`)
- `components/ui/RadioGroup.tsx` — `RadioGroup` + `Radio`
- `components/ui/Tooltip.tsx` — `Tooltip` + re-exported `TooltipTrigger`
- `components/ui/index.ts` — barrel export for the whole `ui` surface
- `components/ui/__tests__/*.test.tsx` — one test file per primitive

**Modify:**
- `app/globals.css` — add a `@theme` token block + global overlay enter/exit keyframes
- `components/ui/Modal.tsx` — wrap content in `FocusScope` (props unchanged)
- `components/ui/dialog-provider.tsx` — render `Button` primitives instead of raw `<button>`
- `package.json` — adds `react-aria-components`, `react-aria` deps

---

## Phase 0 — Foundation

### Task 1: Test harness + dependencies

**Files:**
- Modify: `package.json` (via npm install)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Test: `components/ui/__tests__/infra.test.tsx`

- [ ] **Step 1: Install runtime deps**

```bash
npm install react-aria-components react-aria
```

Expected: both added to `dependencies`. (`react-aria-components` provides Button/Select/Menu/etc.; `react-aria` provides `FocusScope` for the Modal.) Both support React 19 on current releases.

- [ ] **Step 2: Confirm the installed API surface**

```bash
grep -oE "export (declare )?(function|const) (Button|TextField|Input|Label|Text|FieldError|Select|SelectValue|ListBox|ListBoxItem|MenuTrigger|Menu|MenuItem|Popover|Checkbox|Switch|RadioGroup|Radio|Tooltip|TooltipTrigger)" node_modules/react-aria-components/dist/types.d.ts | sort -u
grep -rl "FocusScope" node_modules/react-aria/dist/types.d.ts
```

Expected: each component name appears, and `FocusScope` is found in `react-aria`. If any export name differs from what later tasks use, adjust the import in that task. Do not rely on memory for the API — this grep is the source of truth.

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

- [ ] **Step 4: Write `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// jsdom lacks these; react-aria overlays touch them.
if (!window.matchMedia) {
  // @ts-expect-error minimal stub
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
  });
}
if (!globalThis.ResizeObserver) {
  // @ts-expect-error minimal stub
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
```

- [ ] **Step 5: Write the infra smoke test**

```tsx
// components/ui/__tests__/infra.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

describe("test infra", () => {
  it("renders and jest-dom matchers work", () => {
    render(<button>hi</button>);
    expect(screen.getByRole("button", { name: "hi" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run it**

Run: `npm test`
Expected: PASS (1 file, 1 test). If it fails to resolve `@testing-library/jest-dom/vitest`, confirm `@testing-library/jest-dom` is installed (it is, per package.json).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts components/ui/__tests__/infra.test.tsx
git commit -m "test: vitest+testing-library harness, install react-aria"
```

---

### Task 2: Token layer + overlay animation

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add the semantic `@theme` token block**

Append after the existing shadow `@theme` block (around line 19) in `app/globals.css`:

```css
/* Semantic UI tokens — primitives reference these */
@theme {
  /* brand (replaces inline indigo) */
  --color-brand-50: #eef2ff;
  --color-brand-100: #e0e7ff;
  --color-brand-200: #c7d2fe;
  --color-brand-300: #a5b4fc;
  --color-brand-400: #818cf8;
  --color-brand-500: #6366f1;
  --color-brand-600: #4f46e5;
  --color-brand-700: #4338ca;
  /* neutrals (semantic aliases) */
  --color-fg: #0a0d12;
  --color-fg-muted: #6b7280;
  --color-fg-subtle: #94a3b8;
  --color-bg: #ffffff;
  --color-bg-subtle: #fafafa;
  --color-border: #e4e4e7;
  --color-border-strong: #d4d4d8;
  /* feedback */
  --color-danger-50: #fef2f2;
  --color-danger-500: #ef4444;
  --color-danger-600: #dc2626;
  --color-danger-700: #b91c1c;
  /* shape */
  --radius-control: 0.5rem;
  --radius-panel: 1rem;
}
```

- [ ] **Step 2: Add global overlay enter/exit animation**

react-aria sets `data-entering` / `data-exiting` on overlays during transitions. Add to `app/globals.css` (end of file) so every overlay animates consistently with no per-component code:

```css
@keyframes pc-overlay-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes pc-overlay-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: scale(0.96); } }
[data-entering] { animation: pc-overlay-in 0.12s ease-out; }
[data-exiting]  { animation: pc-overlay-out 0.10s ease-in; }
```

- [ ] **Step 3: Verify the tokens compile into CSS vars**

Run: `npx @tailwindcss/cli -i app/globals.css -o /tmp/pc-theme.css && grep -- "--color-brand-600" /tmp/pc-theme.css`
Expected: prints a line containing `--color-brand-600: #4f46e5;` (proves the `@theme` var is registered). If the CLI binary name differs, use `npx @tailwindcss/cli@4 ...`.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): semantic @theme tokens + overlay animation"
```

---

## Phase 1 — Core primitives

> Each primitive task: write the failing test, run to confirm fail, implement, run to confirm pass, then run `npx tsc --noEmit`, then commit. The implementations use `react-aria-components` render-prop `className` and `data-*` state selectors.

### Task 3: Button

**Files:**
- Create: `components/ui/Button.tsx`
- Test: `components/ui/__tests__/Button.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "../Button";

describe("Button", () => {
  it("renders children and fires onPress on click", async () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("is disabled while loading", () => {
    render(<Button isLoading>Save</Button>);
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/Button.test.tsx`
Expected: FAIL — `Cannot find module '../Button'`.

- [ ] **Step 3: Implement**

```tsx
"use client";
import { Button as RACButton, type ButtonProps as RACButtonProps } from "react-aria-components";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const variantStyles: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-xs",
  secondary: "border border-border-strong bg-white text-fg hover:bg-bg-subtle shadow-xs",
  ghost: "text-fg-muted hover:bg-bg-subtle",
  danger: "bg-danger-600 text-white hover:bg-danger-700 shadow-xs",
  link: "text-brand-600 hover:underline",
};
const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-9 px-3.5 text-sm gap-1.5",
  lg: "h-11 px-5 text-base gap-2",
  icon: "h-9 w-9",
};

export interface ButtonProps extends RACButtonProps {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  variant = "primary", size = "md", isLoading = false,
  leadingIcon, trailingIcon, className, children, isDisabled, ...props
}: ButtonProps) {
  return (
    <RACButton
      {...props}
      isDisabled={isDisabled || isLoading}
      className={(rs) =>
        cn(
          "inline-flex items-center justify-center rounded-control font-semibold outline-none transition-colors",
          "focus-visible:ring-4 focus-visible:ring-brand-100",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant], sizeStyles[size],
          typeof className === "function" ? className(rs) : className,
        )
      }
    >
      {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {!isLoading && leadingIcon}
      {children as ReactNode}
      {!isLoading && trailingIcon}
    </RACButton>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/Button.test.tsx`
Expected: PASS (2 tests). Then run `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Button.tsx components/ui/__tests__/Button.test.tsx
git commit -m "feat(ui): Button primitive"
```

---

### Task 4: TextField

**Files:**
- Create: `components/ui/TextField.tsx`
- Test: `components/ui/__tests__/TextField.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TextField } from "../TextField";

describe("TextField", () => {
  it("associates the label with the input", () => {
    render(<TextField label="Email" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders an error message", () => {
    render(<TextField label="Email" errorMessage="Required" value="" onChange={() => {}} />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/TextField.test.tsx`
Expected: FAIL — `Cannot find module '../TextField'`.

- [ ] **Step 3: Implement**

```tsx
"use client";
import {
  TextField as RACTextField, type TextFieldProps as RACTextFieldProps,
  Label, Input, Text, FieldError,
} from "react-aria-components";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface TextFieldProps extends RACTextFieldProps {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: string;
  placeholder?: string;
}

export function TextField({ label, description, errorMessage, placeholder, className, ...props }: TextFieldProps) {
  return (
    <RACTextField
      {...props}
      isInvalid={!!errorMessage || props.isInvalid}
      className={cn("flex flex-col gap-1.5", typeof className === "string" ? className : undefined)}
    >
      {label && <Label className="text-sm font-medium text-fg">{label}</Label>}
      <Input
        placeholder={placeholder}
        className={cn(
          "w-full rounded-control border border-border-strong bg-white px-3 py-2 text-sm text-fg shadow-xs outline-none transition",
          "placeholder:text-fg-subtle hover:border-fg-subtle",
          "focus:border-brand-400 focus:ring-4 focus:ring-brand-100",
          "data-[invalid]:border-danger-500 disabled:opacity-50",
        )}
      />
      {description && <Text slot="description" className="text-xs text-fg-muted">{description}</Text>}
      <FieldError className="text-xs text-danger-600">{errorMessage}</FieldError>
    </RACTextField>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/TextField.test.tsx` — Expected: PASS (2). Then `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/TextField.tsx components/ui/__tests__/TextField.test.tsx
git commit -m "feat(ui): TextField primitive"
```

---

### Task 5: Textarea

**Files:**
- Create: `components/ui/Textarea.tsx`
- Test: `components/ui/__tests__/Textarea.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Textarea } from "../Textarea";

describe("Textarea", () => {
  it("labels the textarea and reports typed text", async () => {
    const onChange = vi.fn();
    render(<Textarea label="Bio" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Bio"), "hi");
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/Textarea.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
"use client";
import {
  TextField as RACTextField, type TextFieldProps as RACTextFieldProps,
  Label, TextArea, FieldError,
} from "react-aria-components";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface TextareaProps extends RACTextFieldProps {
  label?: ReactNode;
  placeholder?: string;
  rows?: number;
  errorMessage?: string;
}

export function Textarea({ label, placeholder, rows = 4, errorMessage, className, ...props }: TextareaProps) {
  return (
    <RACTextField
      {...props}
      isInvalid={!!errorMessage || props.isInvalid}
      className={cn("flex flex-col gap-1.5", typeof className === "string" ? className : undefined)}
    >
      {label && <Label className="text-sm font-medium text-fg">{label}</Label>}
      <TextArea
        rows={rows}
        placeholder={placeholder}
        className={cn(
          "w-full resize-y rounded-control border border-border-strong bg-white px-3 py-2 text-sm text-fg shadow-xs outline-none transition",
          "placeholder:text-fg-subtle hover:border-fg-subtle",
          "focus:border-brand-400 focus:ring-4 focus:ring-brand-100",
          "data-[invalid]:border-danger-500",
        )}
      />
      <FieldError className="text-xs text-danger-600">{errorMessage}</FieldError>
    </RACTextField>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/Textarea.test.tsx` — Expected: PASS. Then `npx tsc --noEmit` — no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Textarea.tsx components/ui/__tests__/Textarea.test.tsx
git commit -m "feat(ui): Textarea primitive"
```

---

### Task 6: Select

**Files:**
- Create: `components/ui/Select.tsx`
- Test: `components/ui/__tests__/Select.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Select } from "../Select";

const items = [{ id: "admin", label: "Admin" }, { id: "editor", label: "Editor" }];

describe("Select", () => {
  it("opens and reports the chosen key", async () => {
    const onSelectionChange = vi.fn();
    render(<Select label="Role" items={items} onSelectionChange={onSelectionChange} />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(await screen.findByRole("option", { name: "Editor" }));
    expect(onSelectionChange).toHaveBeenCalledWith("editor");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/Select.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
"use client";
import {
  Select as RACSelect, type SelectProps as RACSelectProps,
  Label, Button, SelectValue, Popover, ListBox, ListBoxItem, type Key,
} from "react-aria-components";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface SelectOption { id: Key; label: string }

export interface SelectProps extends Omit<RACSelectProps<SelectOption>, "children"> {
  label?: ReactNode;
  items: SelectOption[];
  placeholder?: string;
}

export function Select({ label, items, placeholder = "Select…", className, ...props }: SelectProps) {
  return (
    <RACSelect
      {...props}
      className={cn("flex flex-col gap-1.5", typeof className === "string" ? className : undefined)}
    >
      {label && <Label className="text-sm font-medium text-fg">{label}</Label>}
      <Button
        className={cn(
          "flex items-center justify-between gap-2 rounded-control border border-border-strong bg-white px-3 py-2 text-sm text-fg shadow-xs outline-none transition",
          "hover:border-fg-subtle focus-visible:border-brand-400 focus-visible:ring-4 focus-visible:ring-brand-100",
        )}
      >
        <SelectValue className="data-[placeholder]:text-fg-subtle">
          {({ selectedText }) => selectedText ?? placeholder}
        </SelectValue>
        <ChevronDown className="size-4 text-fg-subtle" aria-hidden />
      </Button>
      <Popover className="min-w-[var(--trigger-width)] rounded-control border border-border bg-white p-1 shadow-lg outline-none">
        <ListBox items={items} className="outline-none">
          {(item) => (
            <ListBoxItem
              id={item.id}
              textValue={item.label}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-fg outline-none data-[focused]:bg-bg-subtle data-[selected]:font-medium"
            >
              {({ isSelected }) => (
                <>
                  {item.label}
                  {isSelected && <Check className="size-4 text-brand-600" />}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </RACSelect>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/Select.test.tsx` — Expected: PASS. Then `npx tsc --noEmit` — no errors. (If `selectedText` is not present on the `SelectValue` render-prop type per the Task 1 grep, replace the render-prop child with the default `<SelectValue />` and drop the placeholder branch.)

- [ ] **Step 5: Commit**

```bash
git add components/ui/Select.tsx components/ui/__tests__/Select.test.tsx
git commit -m "feat(ui): Select primitive"
```

---

### Task 7: Menu

**Files:**
- Create: `components/ui/Menu.tsx`
- Test: `components/ui/__tests__/Menu.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MenuTrigger } from "react-aria-components";
import { describe, it, expect, vi } from "vitest";
import { Menu, MenuItemRow } from "../Menu";
import { Button } from "../Button";

describe("Menu", () => {
  it("opens on trigger and fires onAction with the item key", async () => {
    const onAction = vi.fn();
    render(
      <MenuTrigger>
        <Button>Open</Button>
        <Menu onAction={onAction}>
          <MenuItemRow id="dup">Duplicate</MenuItemRow>
          <MenuItemRow id="del">Delete</MenuItemRow>
        </Menu>
      </MenuTrigger>
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Duplicate" }));
    expect(onAction).toHaveBeenCalledWith("dup");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/Menu.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
"use client";
import {
  Menu as RACMenu, MenuItem, Popover, type MenuProps as RACMenuProps,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export function Menu<T extends object>({ className, ...props }: RACMenuProps<T>) {
  return (
    <Popover className="min-w-44 rounded-control border border-border bg-white p-1 shadow-lg outline-none">
      <RACMenu
        {...props}
        className={cn("outline-none", typeof className === "string" ? className : undefined)}
      />
    </Popover>
  );
}

export function MenuItemRow({ className, ...props }: React.ComponentProps<typeof MenuItem>) {
  return (
    <MenuItem
      {...props}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-fg outline-none",
        "data-[focused]:bg-bg-subtle data-[disabled]:opacity-50",
        typeof className === "string" ? className : undefined,
      )}
    />
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/Menu.test.tsx` — Expected: PASS. Then `npx tsc --noEmit` — no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Menu.tsx components/ui/__tests__/Menu.test.tsx
git commit -m "feat(ui): Menu primitive"
```

---

### Task 8: Popover (low-level)

**Files:**
- Create: `components/ui/Popover.tsx`
- Test: `components/ui/__tests__/Popover.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DialogTrigger, Dialog } from "react-aria-components";
import { describe, it, expect } from "vitest";
import { Popover } from "../Popover";
import { Button } from "../Button";

describe("Popover", () => {
  it("reveals its content when the trigger is pressed", async () => {
    render(
      <DialogTrigger>
        <Button>Pick</Button>
        <Popover>
          <Dialog className="p-2 outline-none">Swatches</Dialog>
        </Popover>
      </DialogTrigger>
    );
    await userEvent.click(screen.getByRole("button", { name: "Pick" }));
    expect(await screen.findByText("Swatches")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/Popover.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
"use client";
import { Popover as RACPopover, type PopoverProps } from "react-aria-components";
import { cn } from "@/lib/utils";

/** Styled popover box. Animation comes from the global [data-entering]/[data-exiting] rules. */
export function Popover({ className, ...props }: PopoverProps) {
  return (
    <RACPopover
      {...props}
      className={(rs) =>
        cn(
          "rounded-control border border-border bg-white shadow-lg outline-none",
          typeof className === "function" ? className(rs) : className,
        )
      }
    />
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/Popover.test.tsx` — Expected: PASS. Then `npx tsc --noEmit` — no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Popover.tsx components/ui/__tests__/Popover.test.tsx
git commit -m "feat(ui): low-level Popover primitive"
```

---

### Task 9: Checkbox

**Files:**
- Create: `components/ui/Checkbox.tsx`
- Test: `components/ui/__tests__/Checkbox.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Checkbox } from "../Checkbox";

describe("Checkbox", () => {
  it("toggles and reports the new value", async () => {
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange}>Accept</Checkbox>);
    await userEvent.click(screen.getByRole("checkbox", { name: "Accept" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/Checkbox.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
"use client";
import { Checkbox as RACCheckbox, type CheckboxProps as RACCheckboxProps } from "react-aria-components";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface CheckboxProps extends Omit<RACCheckboxProps, "children"> {
  children?: ReactNode;
}

export function Checkbox({ className, children, ...props }: CheckboxProps) {
  return (
    <RACCheckbox
      {...props}
      className={cn("group flex items-center gap-2 text-sm text-fg", typeof className === "string" ? className : undefined)}
    >
      {({ isSelected, isIndeterminate }) => (
        <>
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded-[5px] border border-border-strong bg-white transition",
              "group-data-[selected]:border-brand-600 group-data-[selected]:bg-brand-600",
              "group-data-[focus-visible]:ring-4 group-data-[focus-visible]:ring-brand-100",
            )}
          >
            {isIndeterminate ? <Minus className="size-3 text-white" /> : isSelected ? <Check className="size-3 text-white" /> : null}
          </span>
          {children}
        </>
      )}
    </RACCheckbox>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/Checkbox.test.tsx` — Expected: PASS. Then `npx tsc --noEmit` — no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Checkbox.tsx components/ui/__tests__/Checkbox.test.tsx
git commit -m "feat(ui): Checkbox primitive"
```

---

### Task 10: Switch

**Files:**
- Create: `components/ui/Switch.tsx`
- Test: `components/ui/__tests__/Switch.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Switch } from "../Switch";

describe("Switch", () => {
  it("toggles and reports the new value", async () => {
    const onChange = vi.fn();
    render(<Switch onChange={onChange}>Published</Switch>);
    await userEvent.click(screen.getByRole("switch", { name: "Published" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/Switch.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
"use client";
import { Switch as RACSwitch, type SwitchProps as RACSwitchProps } from "react-aria-components";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface SwitchProps extends Omit<RACSwitchProps, "children"> {
  children?: ReactNode;
}

export function Switch({ className, children, ...props }: SwitchProps) {
  return (
    <RACSwitch
      {...props}
      className={cn("group flex items-center gap-2 text-sm text-fg", typeof className === "string" ? className : undefined)}
    >
      <span
        className={cn(
          "flex h-5 w-9 items-center rounded-full bg-border-strong p-0.5 transition",
          "group-data-[selected]:bg-brand-600 group-data-[focus-visible]:ring-4 group-data-[focus-visible]:ring-brand-100",
        )}
      >
        <span className="size-4 rounded-full bg-white shadow-xs transition group-data-[selected]:translate-x-4" />
      </span>
      {children}
    </RACSwitch>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/Switch.test.tsx` — Expected: PASS. Then `npx tsc --noEmit` — no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Switch.tsx components/ui/__tests__/Switch.test.tsx
git commit -m "feat(ui): Switch primitive"
```

---

### Task 11: RadioGroup

**Files:**
- Create: `components/ui/RadioGroup.tsx`
- Test: `components/ui/__tests__/RadioGroup.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RadioGroup, Radio } from "../RadioGroup";

describe("RadioGroup", () => {
  it("reports the chosen value", async () => {
    const onChange = vi.fn();
    render(
      <RadioGroup label="Plan" onChange={onChange}>
        <Radio value="free">Free</Radio>
        <Radio value="pro">Pro</Radio>
      </RadioGroup>
    );
    await userEvent.click(screen.getByRole("radio", { name: "Pro" }));
    expect(onChange).toHaveBeenCalledWith("pro");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/RadioGroup.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
"use client";
import {
  RadioGroup as RACRadioGroup, type RadioGroupProps as RACRadioGroupProps,
  Radio as RACRadio, type RadioProps as RACRadioProps, Label,
} from "react-aria-components";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface RadioGroupProps extends RACRadioGroupProps {
  label?: ReactNode;
}

export function RadioGroup({ label, className, children, ...props }: RadioGroupProps) {
  return (
    <RACRadioGroup
      {...props}
      className={cn("flex flex-col gap-2", typeof className === "string" ? className : undefined)}
    >
      {label && <Label className="text-sm font-medium text-fg">{label}</Label>}
      {children as ReactNode}
    </RACRadioGroup>
  );
}

export function Radio({ className, children, ...props }: RACRadioProps) {
  return (
    <RACRadio
      {...props}
      className={cn("group flex items-center gap-2 text-sm text-fg", typeof className === "string" ? className : undefined)}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full border border-border-strong bg-white transition",
          "group-data-[selected]:border-brand-600 group-data-[focus-visible]:ring-4 group-data-[focus-visible]:ring-brand-100",
        )}
      >
        <span className="size-2 rounded-full bg-brand-600 opacity-0 transition group-data-[selected]:opacity-100" />
      </span>
      {children as ReactNode}
    </RACRadio>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/RadioGroup.test.tsx` — Expected: PASS. Then `npx tsc --noEmit` — no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/RadioGroup.tsx components/ui/__tests__/RadioGroup.test.tsx
git commit -m "feat(ui): RadioGroup primitive"
```

---

### Task 12: Tooltip

**Files:**
- Create: `components/ui/Tooltip.tsx`
- Test: `components/ui/__tests__/Tooltip.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Tooltip, TooltipTrigger } from "../Tooltip";
import { Button } from "../Button";

describe("Tooltip", () => {
  it("shows on focus", async () => {
    render(
      <TooltipTrigger delay={0}>
        <Button aria-label="Save">S</Button>
        <Tooltip>Save file</Tooltip>
      </TooltipTrigger>
    );
    await userEvent.tab();
    expect(await screen.findByText("Save file")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/Tooltip.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
"use client";
import { Tooltip as RACTooltip, TooltipTrigger, type TooltipProps } from "react-aria-components";
import { cn } from "@/lib/utils";

export { TooltipTrigger };

export function Tooltip({ className, ...props }: TooltipProps) {
  return (
    <RACTooltip
      {...props}
      offset={6}
      className={(rs) =>
        cn(
          "rounded-md bg-fg px-2 py-1 text-xs font-medium text-white shadow-md",
          typeof className === "function" ? className(rs) : className,
        )
      }
    />
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/Tooltip.test.tsx` — Expected: PASS. Then `npx tsc --noEmit` — no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Tooltip.tsx components/ui/__tests__/Tooltip.test.tsx
git commit -m "feat(ui): Tooltip primitive"
```

---

### Task 13: Barrel export

**Files:**
- Create: `components/ui/index.ts`
- Test: `components/ui/__tests__/barrel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import * as ui from "..";

describe("ui barrel", () => {
  it("re-exports the primitive surface", () => {
    for (const name of [
      "Button", "TextField", "Textarea", "Select", "Menu", "MenuItemRow",
      "MenuTrigger", "Popover", "Checkbox", "Switch", "RadioGroup", "Radio",
      "Tooltip", "TooltipTrigger", "Modal", "Table", "Skeleton",
      "DialogProvider", "useConfirm", "useAlert",
    ]) {
      expect(ui[name as keyof typeof ui], `missing export: ${name}`).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/barrel.test.tsx`
Expected: FAIL — `Cannot find module '..'` or missing exports.

- [ ] **Step 3: Implement**

```ts
export { Button } from "./Button";
export type { ButtonProps } from "./Button";
export { TextField } from "./TextField";
export type { TextFieldProps } from "./TextField";
export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";
export { Select } from "./Select";
export type { SelectOption, SelectProps } from "./Select";
export { Menu, MenuItemRow } from "./Menu";
export { Popover } from "./Popover";
export { Checkbox } from "./Checkbox";
export { Switch } from "./Switch";
export { RadioGroup, Radio } from "./RadioGroup";
export { Tooltip, TooltipTrigger } from "./Tooltip";
export { MenuTrigger, DialogTrigger } from "react-aria-components";
export { Modal } from "./Modal";
export { Table, TableContainer, THead, TH, TBody, TR, TD } from "./Table";
export { Skeleton } from "./Skeleton";
export { DialogProvider, useConfirm, useAlert } from "./dialog-provider";
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/barrel.test.tsx` — Expected: PASS. Then `npx tsc --noEmit` — no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/index.ts components/ui/__tests__/barrel.test.tsx
git commit -m "feat(ui): barrel export for ui primitives"
```

---

## Phase 2 — Modal/dialog focus upgrade

### Task 14: Add focus trap + restore to Modal

**Files:**
- Modify: `components/ui/Modal.tsx`
- Test: `components/ui/__tests__/Modal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Modal } from "../Modal";

describe("Modal", () => {
  it("contains Tab focus within the dialog", async () => {
    render(
      <Modal onClose={() => {}}>
        <button>a</button>
        <button>b</button>
      </Modal>
    );
    const a = screen.getByRole("button", { name: "a" });
    const b = screen.getByRole("button", { name: "b" });
    a.focus();
    await userEvent.tab();
    expect(b).toHaveFocus();
    await userEvent.tab();
    expect(a).toHaveFocus(); // wraps — focus is trapped
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/Modal.test.tsx`
Expected: FAIL — second `tab()` moves focus out of the dialog (no containment yet), so `expect(a).toHaveFocus()` fails.

- [ ] **Step 3: Implement — wrap content in `FocusScope`**

Edit `components/ui/Modal.tsx`. Add the import:

```tsx
import { FocusScope } from "react-aria";
```

Then wrap the existing `{children}` inside the inner `motion.div` (the one with `role="dialog"`) with `FocusScope`. The inner `motion.div` block becomes:

```tsx
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 440, damping: 32 }}
            className={cn("w-full rounded-2xl bg-white shadow-2xl ring-1 ring-black/10", className)}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
          >
            <FocusScope contain restoreFocus>
              {children}
            </FocusScope>
          </motion.div>
```

Note: do **not** pass `autoFocus` to `FocusScope` — callers (e.g. `dialog-provider`) rely on their own `autoFocus` attribute for initial focus, and `contain` + `restoreFocus` are the wins here (trap Tab + return focus to the trigger on close). All existing props and the framer-motion animation are unchanged.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ui/__tests__/Modal.test.tsx` — Expected: PASS. Then `npx tsc --noEmit` — no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Modal.tsx components/ui/__tests__/Modal.test.tsx
git commit -m "feat(ui): focus trap + restore in Modal (react-aria FocusScope)"
```

---

### Task 15: Rebuild dialog-provider buttons on the Button primitive

**Files:**
- Modify: `components/ui/dialog-provider.tsx`
- Test: `components/ui/__tests__/dialog-provider.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { DialogProvider, useConfirm } from "../dialog-provider";

function Harness() {
  const confirm = useConfirm();
  return (
    <button onClick={async () => { (window as any).__r = await confirm({ title: "Sure?", confirmLabel: "Yes", cancelLabel: "No" }); }}>
      ask
    </button>
  );
}

describe("dialog-provider", () => {
  it("resolves true when the confirm button is pressed", async () => {
    render(<DialogProvider><Harness /></DialogProvider>);
    await userEvent.click(screen.getByRole("button", { name: "ask" }));
    await userEvent.click(await screen.findByRole("button", { name: "Yes" }));
    await new Promise((r) => setTimeout(r, 0));
    expect((window as any).__r).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ui/__tests__/dialog-provider.test.tsx`
Expected: FAIL initially only if behavior breaks; this test should actually PASS against the current raw-button implementation. Run it first to confirm it passes (it characterizes existing behavior), THEN refactor in Step 3 and keep it green. If it fails at Step 2 for an unrelated reason (e.g. `setTimeout` flush), increase the timeout to `10`.

- [ ] **Step 3: Refactor to use the `Button` primitive**

In `components/ui/dialog-provider.tsx`, add the import:

```tsx
import { Button } from "./Button";
```

Replace the two raw `<button>` elements (the Cancel and the primary confirm/OK buttons, currently around lines 113–134) with:

```tsx
            <div className="mt-5 flex justify-end gap-2">
              {isConfirm && (
                <Button variant="ghost" size="sm" onPress={() => respond(false)}>
                  {(state as ConfirmOptions).cancelLabel || "Cancel"}
                </Button>
              )}
              <Button
                autoFocus
                variant={destructive ? "danger" : "primary"}
                size="sm"
                onPress={() => respond(true)}
              >
                {isConfirm
                  ? (state as ConfirmOptions).confirmLabel || "Confirm"
                  : (state as AlertOptions).okLabel || "OK"}
              </Button>
            </div>
```

Note: react-aria's `Button` uses `onPress`, not `onClick`. The `autoFocus` attribute is forwarded to the underlying button and still drives initial focus (Modal's `FocusScope` does not override it).

- [ ] **Step 4: Run to verify it still passes**

Run: `npx vitest run components/ui/__tests__/dialog-provider.test.tsx` — Expected: PASS (behavior preserved). Then `npx tsc --noEmit` — no errors. Then run the whole suite: `npm test` — Expected: all primitive + modal + provider tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/ui/dialog-provider.tsx components/ui/__tests__/dialog-provider.test.tsx
git commit -m "refactor(ui): dialog-provider uses Button primitive"
```

---

## Subsequent plans (out of scope here)

Phases 3–5 from the spec become their own plans, authored once this foundation is merged and verified:

- **Phase 3 — App-shell migration** (one plan or one per surface): Settings → Dashboard/PageCard → Sidebar/WorkspaceSwitcher/CommandPalette → CMS manager → invites/auth. Mechanical swap of raw `<button>`/`<input>`/`<select>` for primitives. **Migration caveat:** raw `onClick` handlers become `onPress` when moving to `Button`/`Select`.
- **Phase 4 — Editor migration** (last; iframe risk): `controls.tsx`, `ContextMenu`, `TopBar`, `RichTextToolbar`, Color/Unit popovers. **Must** resolve the iframe outside-press dismissal bridge (bridge iframe `pointerdown` → close open overlays) and verify manually in the live editor.
- **Phase 5 — Cleanup:** delete the duplicate editor `Popover`, grep for stray raw `<button>`/`<select>` in the chrome, write a short `components/ui` usage doc.

---

## Self-Review

**Spec coverage:**
- Token layer (`@theme`, semantic names, danger-only feedback) → Task 2 ✓
- Primitive inventory (Button, TextField, Textarea, Select, Menu, Popover, Checkbox, Switch, RadioGroup, Tooltip) → Tasks 3–12 ✓
- Barrel export → Task 13 ✓
- Modal keeps framer-motion + props identical, gains focus trap/restore → Task 14 ✓
- dialog-provider rebuilt on primitives, behavior preserved → Task 15 ✓
- Animation: framer-motion retained on Modal; overlays animate via global CSS (not a new dep) → Tasks 2 & 14 ✓
- "Verify RAC API from docs, not memory" → Task 1, Step 2 ✓
- Test gate `tsc --noEmit` + `npm test`, never `next build` → header + every task ✓
- Editor reconciliation + app-shell migration → explicitly deferred to subsequent plans ✓ (scope split, called out)
- `Slider`/`Segmented` (editor-only) → belong to Phase 4, not this plan ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; every command has expected output. The one conditional ("if `selectedText` isn't on the type…") names the exact fallback, not a vague instruction.

**Type consistency:** `cn()` signature matches `lib/utils.ts`. `SelectOption { id: Key; label }` is defined in Task 6 and re-exported in Task 13. `Button` uses `onPress` consistently (Tasks 3, 15, and the Phase 3 caveat). `MenuItemRow`/`Menu` names match between Task 7, its test, and the barrel. `FocusScope` imported from `react-aria` (per Task 1 install) in Task 14.
