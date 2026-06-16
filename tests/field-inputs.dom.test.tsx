// Render test for the LEAF_INPUTS field map: proves the shared control renderers
// actually mount and wire onChange (complements the node-env key-coverage test).
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LEAF_INPUTS } from "@/lib/field-inputs";

describe("LEAF_INPUTS renderers (dom)", () => {
  it("text: renders an input with the given value and emits changes", () => {
    const onChange = vi.fn();
    render(<div>{LEAF_INPUTS.text({ value: "hi", onChange })}</div>);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveValue("hi");
    fireEvent.change(input, { target: { value: "bye" } });
    expect(onChange).toHaveBeenCalledWith("bye");
  });

  it("select: renders the provided options", () => {
    const onChange = vi.fn();
    render(
      <div>
        {LEAF_INPUTS.select({
          value: "b",
          onChange,
          options: [
            { label: "Alpha", value: "a" },
            { label: "Beta", value: "b" },
          ],
        })}
      </div>,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select).toHaveValue("b");
    expect(screen.getByRole("option", { name: "Alpha" })).toBeInTheDocument();
  });

  it("boolean: renders a toggle button and emits the negated value", () => {
    const onChange = vi.fn();
    render(<div>{LEAF_INPUTS.boolean({ value: false, onChange })}</div>);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
