// Smoke test proving the jsdom component harness works end-to-end:
// renders the shared Modal (framer-motion) and asserts open/closed behavior.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "@/components/editor/Modal";

describe("Modal (harness smoke)", () => {
  it("renders its children when open", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>dialog body</p>
      </Modal>,
    );
    expect(screen.getByText("dialog body")).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>hidden body</p>
      </Modal>,
    );
    expect(screen.queryByText("hidden body")).toBeNull();
  });

  it("fires onClose when the backdrop (outside the dialog) is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>inner</p>
      </Modal>,
    );
    // The dialog stops propagation; the backdrop is its parent. Walk up from the
    // text node: <p> -> dialog -> backdrop.
    const backdrop = screen.getByText("inner").parentElement!.parentElement!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire onClose when the dialog itself is clicked (stopPropagation)", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>inner</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText("inner"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
