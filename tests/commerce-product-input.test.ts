import { describe, it, expect } from "vitest";
import { pickProductData, pickVariantData, buildImageRows } from "@/lib/commerce/product-input";

describe("pickProductData", () => {
  it("keeps only present, correctly-typed scalar fields", () => {
    expect(
      pickProductData({ title: "Hat", description: "d", status: "ACTIVE", data: "{}", extra: 1 }),
    ).toEqual({ title: "Hat", description: "d", status: "ACTIVE", data: "{}" });
  });

  it("drops fields of the wrong type and unknown bodies", () => {
    expect(pickProductData({ title: 5, status: null })).toEqual({});
    expect(pickProductData(null)).toEqual({});
    expect(pickProductData("nope")).toEqual({});
  });
});

describe("pickVariantData", () => {
  it("includes provided fields", () => {
    expect(pickVariantData({ title: "S", options: "o", sku: "x", inventory: 3 })).toEqual({
      title: "S",
      options: "o",
      sku: "x",
      inventory: 3,
    });
  });

  it("clears the cached Stripe price id when the price changes", () => {
    expect(pickVariantData({ priceAmount: 1200 })).toEqual({
      priceAmount: 1200,
      stripePriceId: null,
    });
  });

  it("returns an empty patch when nothing valid is provided", () => {
    expect(pickVariantData({ priceAmount: "12", inventory: "3" })).toEqual({});
    expect(pickVariantData(undefined)).toEqual({});
  });
});

describe("buildImageRows", () => {
  it("filters to string urls and re-indexes position over the filtered order", () => {
    expect(
      buildImageRows([{ url: "a", alt: "A" }, { url: 5 }, { alt: "no url" }, { url: "b" }], "p1"),
    ).toEqual([
      { productId: "p1", url: "a", alt: "A", position: 0 },
      { productId: "p1", url: "b", alt: "", position: 1 },
    ]);
  });

  it("returns [] for non-arrays", () => {
    expect(buildImageRows(undefined, "p1")).toEqual([]);
    expect(buildImageRows({ url: "a" }, "p1")).toEqual([]);
  });
});
