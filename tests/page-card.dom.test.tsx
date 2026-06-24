import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageCard, type DashboardPage } from "@/components/dashboard/PageCard";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const base: DashboardPage = {
  id: "p1",
  title: "Portfolio",
  slug: "portfolio",
  published: true,
  updatedAt: new Date("2026-06-16T12:00:00Z").toISOString(),
  submissions: 0,
  thumbnailUrl: "/uploads/thumbnails/p1.png",
  thumbnailVersion: 1,
};

describe("PageCard", () => {
  it("links view-live to the site's domain for a published page with an active domain", () => {
    const { container } = render(
      <PageCard
        page={base}
        index={0}
        liveHost="example.com"
        deleting={false}
        onOpenSubmissions={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(container.querySelector('a[href="https://example.com/p/portfolio"]')).not.toBeNull();
  });

  it("shows no view-live link for a published page when no domain is connected", () => {
    const { container } = render(
      <PageCard
        page={base}
        index={0}
        liveHost={null}
        deleting={false}
        onOpenSubmissions={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(container.querySelector('a[href^="https://"]')).toBeNull();
  });

  it("shows a Draft pill and no view-live link for an unpublished page", () => {
    const draft: DashboardPage = { ...base, id: "p2", slug: "draft-x", published: false };
    const { container } = render(
      <PageCard
        page={draft}
        index={0}
        liveHost="example.com"
        deleting={false}
        onOpenSubmissions={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(container.querySelector('a[href="https://example.com/p/draft-x"]')).toBeNull();
  });
});
