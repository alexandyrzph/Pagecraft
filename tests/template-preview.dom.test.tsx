import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplatePreview } from "@/components/dashboard/TemplatePreview";
import { TEMPLATES } from "@/lib/blocks/templates";

function must<T>(v: T | null | undefined): T {
  if (v == null) throw new Error("expected a value");
  return v;
}

describe("TemplatePreview", () => {
  it("renders the real blocks of a template (landing hero title)", () => {
    const landing = TEMPLATES.find((t) => t.id === "landing");
    expect(landing).toBeDefined();
    render(<TemplatePreview blocks={must(landing).build()} />);
    expect(screen.getByText("Ship beautiful pages in minutes")).toBeInTheDocument();
  });

  it("shows the empty-canvas placeholder for a blank template", () => {
    render(<TemplatePreview blocks={[]} />);
    expect(screen.getByText("Empty canvas")).toBeInTheDocument();
  });
});
