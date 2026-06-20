import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { DialogProvider, useConfirm } from "../dialog-provider";

declare global {
  interface Window {
    __r?: boolean;
  }
}

function Harness() {
  const confirm = useConfirm();
  return (
    <button
      onClick={async () => {
        window.__r = await confirm({
          title: "Sure?",
          confirmLabel: "Yes",
          cancelLabel: "No",
        });
      }}
    >
      ask
    </button>
  );
}

describe("dialog-provider", () => {
  it("keeps initial focus on the confirm button (not cancel)", async () => {
    render(
      <DialogProvider>
        <Harness />
      </DialogProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "ask" }));
    const yes = await screen.findByRole("button", { name: "Yes" });
    expect(yes).toHaveFocus();
  });

  it("resolves true when the confirm button is pressed", async () => {
    render(
      <DialogProvider>
        <Harness />
      </DialogProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "ask" }));
    await userEvent.click(await screen.findByRole("button", { name: "Yes" }));
    await new Promise((r) => setTimeout(r, 10));
    expect(window.__r).toBe(true);
  });
});
