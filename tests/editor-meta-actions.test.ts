import { describe, it, expect } from "vitest";
import { createMetaActions } from "@/store/editor-store.actions";

describe("createMetaActions", () => {
  it("setSlug and setNoindex set state and mark dirty", () => {
    const calls: Array<Record<string, unknown>> = [];
    const set = ((patch: Record<string, unknown>) => calls.push(patch)) as never;
    const actions = createMetaActions(set);
    actions.setSlug("about-us");
    actions.setNoindex(true);
    expect(calls[0]).toEqual({ slug: "about-us", dirty: true });
    expect(calls[1]).toEqual({ noindex: true, dirty: true });
  });
});
