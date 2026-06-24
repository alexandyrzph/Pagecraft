import { describe, it, expect } from "vitest";
import { needsSetup } from "@/lib/auth/setup-gate";

describe("needsSetup", () => {
  it("is true when the user has no workspace", () => {
    expect(needsSetup({ hasWorkspace: false, siteCount: 0 })).toBe(true);
  });
  it("is true when the workspace has zero sites", () => {
    expect(needsSetup({ hasWorkspace: true, siteCount: 0 })).toBe(true);
  });
  it("is false once a workspace has at least one site", () => {
    expect(needsSetup({ hasWorkspace: true, siteCount: 1 })).toBe(false);
  });
});
