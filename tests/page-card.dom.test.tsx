import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageCard, type DashboardPage } from "@/components/dashboard/PageCard";

const base: DashboardPage = {
  id: "p1",
  title: "Portfolio",
  slug: "portfolio",
  published: true,
  updatedAt: new Date("2026-06-16T12:00:00Z").toISOString(),
  submissions: 0,
  thumbnailUrl: "/uploads/thumbnails/p1.png",
  thumbnailVersion: 1,
  thumbnailStale: false,
};

describe("PageCard", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("no net"))));
  });

  it("shows a Live pill and a view-live link for a published page", () => {
    const { container } = render(
      <PageCard page={base} index={0} deleting={false} onOpenSubmissions={() => {}} onDelete={() => {}} />,
    );
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(container.querySelector('a[href="/p/portfolio"]')).not.toBeNull();
  });

  it("shows a Draft pill and no view-live link for an unpublished page", () => {
    const draft: DashboardPage = { ...base, id: "p2", slug: "draft-x", published: false };
    const { container } = render(
      <PageCard page={draft} index={0} deleting={false} onOpenSubmissions={() => {}} onDelete={() => {}} />,
    );
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(container.querySelector('a[href="/p/draft-x"]')).toBeNull();
  });
});
