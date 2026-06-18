import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Slider } from "../Slider";

describe("Slider", () => {
  it("renders an accessible slider with the current value", () => {
    render(<Slider aria-label="Opacity" value={50} minValue={0} maxValue={100} onChange={vi.fn()} />);
    // RAC renders the slider role on a native <input type="range">, so the
    // value/bounds live on value/max (+ aria-valuetext) rather than aria-valuenow.
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider).toHaveValue("50");
    expect(slider).toHaveAttribute("max", "100");
    expect(slider).toHaveAttribute("aria-valuetext", "50");
  });

  it("reports an increased value on keyboard increment", async () => {
    const onChange = vi.fn();
    render(<Slider aria-label="Opacity" value={50} minValue={0} maxValue={100} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    slider.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalled();
    const reported = onChange.mock.calls.at(-1)![0] as number;
    expect(reported).toBeGreaterThan(50);
  });
});
