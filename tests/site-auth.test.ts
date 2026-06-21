import { describe, it, expect } from "vitest";
import { resolveActiveSite } from "@/lib/auth/site";

describe("resolveActiveSite", () => {
  const sites = [{ id: "a" }, { id: "b" }];
  it("returns null when there are no sites", () => {
    expect(resolveActiveSite([], "a")).toBeNull();
  });
  it("returns the wanted site when present", () => {
    expect(resolveActiveSite(sites, "b")?.id).toBe("b");
  });
  it("falls back to the first site for a missing/unknown id", () => {
    expect(resolveActiveSite(sites, undefined)?.id).toBe("a");
    expect(resolveActiveSite(sites, "zzz")?.id).toBe("a");
  });
});
