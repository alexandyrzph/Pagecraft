import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageThumbnail } from "@/components/dashboard/PageThumbnail";

describe("PageThumbnail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("no network in test"))));
  });

  it("shows the cached image (cache-busted) when one exists and it is fresh", () => {
    render(
      <PageThumbnail
        pageId="p1"
        title="Portfolio"
        gradient="from-rose-500 to-pink-600"
        initialUrl="/uploads/thumbnails/p1.png"
        version={42}
        stale={false}
      />,
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("/uploads/thumbnails/p1.png?v=42");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to the gradient + first letter when there is no image", () => {
    render(
      <PageThumbnail
        pageId="p2"
        title="acme landing"
        gradient="from-sky-500 to-blue-600"
        initialUrl={null}
        version={null}
        stale={false}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
