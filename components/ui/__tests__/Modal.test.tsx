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
