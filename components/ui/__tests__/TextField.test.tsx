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

  it("renders a description hint", () => {
    render(<TextField label="Email" description="We'll never share this" value="" onChange={() => {}} />);
    expect(screen.getByText("We'll never share this")).toBeInTheDocument();
  });
});
