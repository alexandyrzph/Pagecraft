import { describe, it, expect } from "vitest";
import {
  isOutOfStock,
  optionNamesFor,
  optionValuesFor,
  resolveMatchedVariant,
  resolveProduct,
  variantForSelected,
} from "@/components/blocks/product.helpers";
import type { ProductMap, StoreProduct, StoreVariant } from "@/lib/commerce/product-service";

function variant(over: Partial<StoreVariant> = {}): StoreVariant {
  return {
    id: "v1",
    title: "Default",
    options: {},
    priceAmount: 1000,
    currency: "usd",
    inventory: 5,
    inventoryPolicy: "deny",
    ...over,
  };
}

function product(over: Partial<StoreProduct> = {}): StoreProduct {
  return {
    id: "p1",
    handle: "p1",
    title: "Tee",
    description: "",
    status: "active",
    data: {},
    images: [],
    variants: [variant()],
    minPrice: null,
    ...over,
  };
}

describe("variantForSelected", () => {
  const variants = [
    variant({ id: "a", options: { Size: "S", Color: "Red" } }),
    variant({ id: "b", options: { Size: "M", Color: "Red" } }),
  ];

  it("returns the variant whose options match every selected key", () => {
    expect(variantForSelected(variants, { Size: "M", Color: "Red" })).toBe("b");
  });

  it("matches on a partial selection (only the selected keys must agree)", () => {
    expect(variantForSelected(variants, { Size: "S" })).toBe("a");
  });

  it("returns the first variant when selection is empty (vacuous every)", () => {
    expect(variantForSelected(variants, {})).toBe("a");
  });

  it("returns null when no variant matches", () => {
    expect(variantForSelected(variants, { Size: "XL" })).toBeNull();
  });
});

describe("resolveProduct", () => {
  const map: ProductMap = { p1: product({ id: "p1" }), p2: product({ id: "p2" }) };

  it("returns the product addressed by id when productId is set", () => {
    expect(resolveProduct(map, "p2")?.id).toBe("p2");
  });

  it("falls back to the first map value when productId is empty", () => {
    expect(resolveProduct(map, "")?.id).toBe("p1");
  });

  it("returns undefined for an empty map with no id", () => {
    expect(resolveProduct({}, "")).toBeUndefined();
  });

  it("returns undefined for an unknown id", () => {
    expect(resolveProduct(map, "nope")).toBeUndefined();
  });
});

describe("optionNamesFor", () => {
  it("collects the union of option keys across variants, deduped", () => {
    const variants = [
      variant({ options: { Size: "S", Color: "Red" } }),
      variant({ options: { Size: "M", Material: "Cotton" } }),
    ];
    expect(optionNamesFor(variants)).toEqual(["Size", "Color", "Material"]);
  });

  it("returns an empty array when there are no options", () => {
    expect(optionNamesFor([variant({ options: {} })])).toEqual([]);
  });
});

describe("optionValuesFor", () => {
  it("returns deduped, falsy-filtered values for a given option name", () => {
    const variants = [
      variant({ options: { Size: "S" } }),
      variant({ options: { Size: "M" } }),
      variant({ options: { Size: "S" } }),
      variant({ options: { Size: "" } }),
    ];
    expect(optionValuesFor(variants, "Size")).toEqual(["S", "M"]);
  });
});

describe("resolveMatchedVariant", () => {
  const variants = [
    variant({ id: "a", options: { Size: "S" } }),
    variant({ id: "b", options: { Size: "M" } }),
  ];

  it("returns the matching variant for a selection", () => {
    expect(resolveMatchedVariant(variants, { Size: "M" })?.id).toBe("b");
  });

  it("falls back to the first variant when nothing matches", () => {
    expect(resolveMatchedVariant(variants, { Size: "XL" })?.id).toBe("a");
  });

  it("returns undefined when there are no variants", () => {
    expect(resolveMatchedVariant([], {})).toBeUndefined();
  });
});

describe("isOutOfStock", () => {
  it("is true only when inventory is zero and policy denies", () => {
    expect(isOutOfStock(variant({ inventory: 0, inventoryPolicy: "deny" }))).toBe(true);
  });

  it("is false when inventory remains", () => {
    expect(isOutOfStock(variant({ inventory: 3, inventoryPolicy: "deny" }))).toBe(false);
  });

  it("is false when policy allows backorder even at zero inventory", () => {
    expect(isOutOfStock(variant({ inventory: 0, inventoryPolicy: "continue" }))).toBe(false);
  });
});
