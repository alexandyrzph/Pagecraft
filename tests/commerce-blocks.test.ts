import { describe, it, expect } from "vitest";
import { commerceBlocks } from "@/components/blocks/commerce.defs";

describe("commerce block defs", () => {
  it("registers product-grid, product, add-to-cart, cart, and checkout with Commerce category and required fields", () => {
    const types = commerceBlocks.map((b) => b.type);
    expect(types).toEqual(["product-grid", "product", "add-to-cart", "cart", "checkout"]);
    for (const b of commerceBlocks) {
      expect(b.category).toBe("Commerce");
      expect(typeof b.label).toBe("string");
      expect(b.defaultProps).toBeTypeOf("object");
      expect(b.defaultStyles).toBeTypeOf("object");
      expect(typeof b.Render).toBe("function");
    }
  });
});
