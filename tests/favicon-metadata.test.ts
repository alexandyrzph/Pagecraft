import { describe, it, expect } from "vitest";
import { faviconMetadata } from "@/lib/seo/favicon";

describe("faviconMetadata", () => {
  it("returns an icons block when a favicon is set", () => {
    expect(faviconMetadata("/f.ico")).toEqual({ icons: { icon: "/f.ico" } });
  });
  it("returns an empty object when missing", () => {
    expect(faviconMetadata(null)).toEqual({});
    expect(faviconMetadata(undefined)).toEqual({});
    expect(faviconMetadata("")).toEqual({});
  });
});
