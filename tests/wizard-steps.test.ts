import { describe, it, expect } from "vitest";
import { wizardSteps } from "@/components/setup/wizard-steps";

describe("wizardSteps", () => {
  it("includes the workspace step for a brand-new user", () => {
    expect(wizardSteps(false)).toEqual(["workspace", "site", "domain"]);
  });
  it("skips the workspace step when one already exists", () => {
    expect(wizardSteps(true)).toEqual(["site", "domain"]);
  });
});
