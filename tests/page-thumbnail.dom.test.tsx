import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageThumbnail } from "@/components/dashboard/PageThumbnail";

describe("PageThumbnail", () => {
  it("shows the cached image (cache-busted) when one exists", () => {
    render(
      <PageThumbnail title="Portfolio" initialUrl="/uploads/thumbnails/p1.png" version={42} />,
    );
    expect(screen.getByRole("img").getAttribute("src")).toBe("/uploads/thumbnails/p1.png?v=42");
  });

  it("shows a neutral placeholder when there is no image", () => {
    render(<PageThumbnail title="acme landing" initialUrl={null} version={null} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
