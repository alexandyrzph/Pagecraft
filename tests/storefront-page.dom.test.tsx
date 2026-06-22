import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { Block } from "@/lib/types";

vi.mock("@/components/BlockRenderer", () => ({
  BlockRenderer: ({ tree }: { tree: Block[] }) => (
    <div data-block-tree={tree.map((b) => b.id).join(",")} />
  ),
}));

import { StorefrontPage } from "@/components/store/StorefrontPage";

const block = (id: string): Block => ({ id, type: "text", props: {}, styles: {}, children: [] });

function renderedTrees(container: HTMLElement): (string | null)[] {
  return [...container.querySelectorAll("[data-block-tree]")].map((n) =>
    n.getAttribute("data-block-tree"),
  );
}

describe("StorefrontPage", () => {
  it("renders header, the given content, and a design-system <style>; skips an empty footer", () => {
    const site = {
      header: JSON.stringify([block("hdr")]),
      footer: "[]",
      colors: "[]",
      textStyles: "[]",
    };
    const { container } = render(<StorefrontPage site={site} map={{}} content={[block("body")]} />);
    expect(renderedTrees(container)).toEqual(["hdr", "body"]);
    expect(container.querySelector("style")).not.toBeNull();
  });

  it("renders the footer when present and skips an empty header", () => {
    const site = {
      header: "[]",
      footer: JSON.stringify([block("ftr")]),
      colors: "[]",
      textStyles: "[]",
    };
    const { container } = render(<StorefrontPage site={site} map={{}} content={[block("body")]} />);
    expect(renderedTrees(container)).toEqual(["body", "ftr"]);
  });
});
