import { describe, it, expect } from "vitest";
import { signState, verifyState } from "@/lib/auth/oauth-state";

describe("oauth state", () => {
  const NOW = 1_000_000_000_000;

  it("round-trips the payload", () => {
    const t = signState({ next: "/dashboard" }, NOW);
    expect(verifyState(t, NOW)).toEqual({ next: "/dashboard" });
  });

  it("works with no next", () => {
    const t = signState({}, NOW);
    expect(verifyState(t, NOW)).toEqual({ next: "" });
  });

  it("rejects a tampered token", () => {
    const t = signState({ next: "/x" }, NOW);
    expect(verifyState(t + "z", NOW)).toBeNull();
    expect(verifyState("garbage", NOW)).toBeNull();
  });

  it("rejects an expired token", () => {
    const t = signState({ next: "/x" }, NOW);
    expect(verifyState(t, NOW + 11 * 60_000)).toBeNull();
  });
});
