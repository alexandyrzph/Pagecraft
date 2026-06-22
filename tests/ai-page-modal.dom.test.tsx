import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach } from "vitest";
import { AiPageModal } from "@/components/dashboard/Dashboard.helpers";

afterEach(cleanup);

function setup(onGenerate: (p: string) => Promise<string | null>) {
  const onClose = vi.fn();
  const onDone = vi.fn();
  render(<AiPageModal open onClose={onClose} onGenerate={onGenerate} onDone={onDone} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "  a meal planner  " } });
  return { onClose, onDone };
}

describe("AiPageModal run", () => {
  it("trims the prompt, generates, and calls onDone with the new id", async () => {
    const onGenerate = vi.fn(async () => "p9");
    const { onDone } = setup(onGenerate);
    await userEvent.click(screen.getByRole("button", { name: /generate page/i }));
    expect(onGenerate).toHaveBeenCalledWith("a meal planner");
    await screen.findByText(/generate page/i); // settled
    expect(onDone).toHaveBeenCalledWith("p9");
  });

  it("shows a fallback error when generation returns null", async () => {
    const onGenerate = vi.fn(async () => null);
    const { onDone } = setup(onGenerate);
    await userEvent.click(screen.getByRole("button", { name: /generate page/i }));
    await screen.findByText("Could not create the page.");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("surfaces a thrown error message", async () => {
    const onGenerate = vi.fn(async () => {
      throw new Error("boom");
    });
    setup(onGenerate);
    await userEvent.click(screen.getByRole("button", { name: /generate page/i }));
    await screen.findByText("boom");
  });

  it("does nothing for a blank prompt (button disabled)", async () => {
    const onGenerate = vi.fn(async () => "p1");
    const onClose = vi.fn();
    const onDone = vi.fn();
    render(<AiPageModal open onClose={onClose} onGenerate={onGenerate} onDone={onDone} />);
    expect(screen.getByRole("button", { name: /generate page/i })).toBeDisabled();
    expect(onGenerate).not.toHaveBeenCalled();
  });
});
