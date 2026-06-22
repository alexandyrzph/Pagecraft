import { describe, it, expect, vi, afterEach } from "vitest";
import { buildInitPayload, scheduleReady } from "@/components/editor/EditorClient.helpers";
import type { PageDTO } from "@/components/editor/EditorClient";

afterEach(() => {
  vi.useRealTimers();
});

function page(over: Partial<PageDTO> = {}): PageDTO {
  return {
    id: "p1",
    title: "Home",
    slug: "home",
    published: false,
    content: [],
    ...over,
  };
}

describe("buildInitPayload", () => {
  it("maps a fully-populated page DTO onto the editor init shape", () => {
    const seo = { metaTitle: "M", metaDescription: "D", ogImage: "o.png" };
    const theme = { tokens: {} } as unknown as PageDTO["theme"];
    const content = [
      { id: "a", type: "Section", props: {}, styles: {}, children: [] },
    ] as PageDTO["content"];
    const payload = buildInitPayload(page({ published: true, content, seo, theme }));
    expect(payload).toEqual({
      id: "p1",
      title: "Home",
      slug: "home",
      published: true,
      tree: content,
      seo,
      theme,
    });
    // tree must be the same reference (no copy) to match prior behavior
    expect(payload.tree).toBe(content);
  });

  it("passes through undefined seo/theme untouched", () => {
    const payload = buildInitPayload(page());
    expect(payload.seo).toBeUndefined();
    expect(payload.theme).toBeUndefined();
    expect(payload.published).toBe(false);
    expect(payload.tree).toEqual([]);
  });
});

describe("scheduleReady", () => {
  it("flips ready to true after 550ms", () => {
    vi.useFakeTimers();
    const setReady = vi.fn();
    scheduleReady(setReady);
    expect(setReady).not.toHaveBeenCalled();
    vi.advanceTimersByTime(549);
    expect(setReady).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(setReady).toHaveBeenCalledTimes(1);
    expect(setReady).toHaveBeenCalledWith(true);
  });

  it("returns a cleanup that cancels the pending timer", () => {
    vi.useFakeTimers();
    const setReady = vi.fn();
    const cleanup = scheduleReady(setReady);
    cleanup();
    vi.advanceTimersByTime(1000);
    expect(setReady).not.toHaveBeenCalled();
  });
});
