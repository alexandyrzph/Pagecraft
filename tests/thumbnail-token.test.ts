import { describe, it, expect } from "vitest";
import { signShotToken, verifyShotToken } from "@/lib/thumbnails/token";

describe("shot token", () => {
  const NOW = 1_000_000_000_000;

  it("verifies a freshly signed token", () => {
    const t = signShotToken("page1", NOW);
    expect(verifyShotToken("page1", t, NOW)).toBe(true);
  });

  it("rejects a token for a different page id", () => {
    const t = signShotToken("page1", NOW);
    expect(verifyShotToken("page2", t, NOW)).toBe(false);
  });

  it("rejects an expired token", () => {
    const t = signShotToken("page1", NOW);
    expect(verifyShotToken("page1", t, NOW + 61_000)).toBe(false);
  });

  it("rejects malformed/tampered tokens", () => {
    expect(verifyShotToken("page1", "garbage", NOW)).toBe(false);
    expect(verifyShotToken("page1", "", NOW)).toBe(false);
    const t = signShotToken("page1", NOW);
    expect(verifyShotToken("page1", t + "x", NOW)).toBe(false);
  });
});
