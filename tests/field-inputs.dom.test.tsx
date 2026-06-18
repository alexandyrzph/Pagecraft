// Render test for the LEAF_INPUTS field map: proves the shared control renderers
// actually mount and wire onChange (complements the node-env key-coverage test).
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("select: shows the current value and emits the chosen key (RAC Select)", async () => {
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
    // The RAC Select renders a button trigger (not a native <select>) whose
    // text reflects the current value.
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveTextContent("Beta");
    // Opening it surfaces the options in the listbox popover.
    await userEvent.click(trigger);
    expect(await screen.findByRole("option", { name: "Alpha" })).toBeInTheDocument();
    // Picking one reports the option's key (value).
    await userEvent.click(screen.getByRole("option", { name: "Alpha" }));
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("boolean: renders a switch and emits the new value (RAC Switch)", async () => {
    const onChange = vi.fn();
    render(<div>{LEAF_INPUTS.boolean({ value: false, onChange })}</div>);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
