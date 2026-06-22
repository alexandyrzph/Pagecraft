import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "react-aria-components";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { FieldShell, fieldControlClassName } from "@/components/ui/field-shell";

describe("FieldShell", () => {
  it("renders label, control, description and error, and marks the control invalid", () => {
    render(
      <FieldShell label="Name" description="Your name" errorMessage="Required">
        <Input className={fieldControlClassName} />
      </FieldShell>,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Your name")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("rounded-control");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});

describe("TextField rendered output", () => {
  it("renders label, input with placeholder, description and error inside the field shell", () => {
    const { container } = render(
      <TextField
        label="Email"
        placeholder="you@x.com"
        description="We never share it"
        errorMessage="Bad email"
      />,
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("We never share it")).toBeInTheDocument();
    expect(screen.getByText("Bad email")).toBeInTheDocument();
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("placeholder", "you@x.com");
    expect(input).toHaveClass("rounded-control", "border-border-strong");
    expect(container.querySelector(".flex.flex-col.gap-1\\.5")).not.toBeNull();
  });
});

describe("Textarea rendered output", () => {
  it("renders label, a resizable textarea with the given rows, and error", () => {
    render(<Textarea label="Bio" placeholder="About you" rows={6} errorMessage="Too long" />);
    expect(screen.getByText("Bio")).toBeInTheDocument();
    expect(screen.getByText("Too long")).toBeInTheDocument();
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(ta.tagName).toBe("TEXTAREA");
    expect(ta).toHaveAttribute("rows", "6");
    expect(ta).toHaveClass("resize-y", "rounded-control");
  });
});
