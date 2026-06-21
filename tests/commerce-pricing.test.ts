import { describe, it, expect } from "vitest";
import {
  formatMoney,
  minVariantPrice,
  parseOptions,
  variantForOptions,
} from "@/lib/commerce/pricing";

describe("formatMoney", () => {
  it("formats minor units by currency", () => {
    expect(formatMoney(1999, "usd")).toBe("$19.99");
    expect(formatMoney(0, "usd")).toBe("$0.00");
    expect(formatMoney(5000, "eur")).toBe("€50.00");
  });
});

describe("minVariantPrice", () => {
  it("returns the lowest price, or null for no variants", () => {
    expect(
      minVariantPrice([
        { priceAmount: 2000, currency: "usd" },
        { priceAmount: 1500, currency: "usd" },
      ]),
    ).toEqual({ amount: 1500, currency: "usd" });
    expect(minVariantPrice([])).toBeNull();
  });
});

describe("parseOptions / variantForOptions", () => {
  it("parses options json and resolves the matching variant", () => {
    expect(parseOptions('{"Size":"S"}')).toEqual({ Size: "S" });
    expect(parseOptions("nonsense")).toEqual({});
    const variants = [
      { id: "v1", options: '{"Size":"S","Color":"Black"}' },
      { id: "v2", options: '{"Size":"M","Color":"Black"}' },
    ];
    expect(variantForOptions(variants, { Size: "M", Color: "Black" })).toBe("v2");
    expect(variantForOptions(variants, { Size: "L", Color: "Black" })).toBeNull();
  });
});
