import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkspaceTrigger } from "@/components/app-shell/WorkspaceSwitcher.helpers";

describe("WorkspaceTrigger", () => {
  it("renders the name, plan, chevron and no title when expanded, and fires onToggle on click", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <WorkspaceTrigger collapsed={false} name="Acme Inc" initials="AC" onToggle={onToggle} />,
    );

    const button = screen.getByRole("button");
    expect(button).not.toHaveAttribute("title");
    expect(screen.getByText("AC")).toBeInTheDocument();
    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
    expect(screen.getByText("Free plan")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("hides the name/plan/chevron and sets the title tooltip when collapsed", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <WorkspaceTrigger collapsed={true} name="Acme Inc" initials="AC" onToggle={onToggle} />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("title", "Acme Inc");
    expect(button.className).toContain("justify-center");
    expect(screen.getByText("AC")).toBeInTheDocument();
    expect(screen.queryByText("Acme Inc")).toBeNull();
    expect(screen.queryByText("Free plan")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });
});
