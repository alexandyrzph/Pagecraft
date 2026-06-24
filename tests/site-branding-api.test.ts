import { describe, it, expect } from "vitest";
import { siteBrandingJson } from "@/lib/sites/branding";

describe("siteBrandingJson", () => {
  it("exposes name + logo + favicon", () => {
    expect(siteBrandingJson({ name: "S", logoUrl: "/l", faviconUrl: "/f" })).toEqual({
      name: "S",
      logoUrl: "/l",
      faviconUrl: "/f",
    });
  });
});
