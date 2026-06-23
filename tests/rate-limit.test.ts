import { describe, it, expect, beforeEach } from "vitest";
import { hit, clientIp, enforce, resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => resetRateLimits());

describe("hit", () => {
  it("allows up to the limit, then blocks within the window", () => {
    expect(hit("k", 2, 1000, 0)).toBe(true);
    expect(hit("k", 2, 1000, 100)).toBe(true);
    expect(hit("k", 2, 1000, 200)).toBe(false);
  });

  it("resets after the window elapses", () => {
    expect(hit("k", 1, 1000, 0)).toBe(true);
    expect(hit("k", 1, 1000, 500)).toBe(false);
    expect(hit("k", 1, 1000, 1000)).toBe(true);
  });

  it("tracks distinct keys independently", () => {
    expect(hit("a", 1, 1000, 0)).toBe(true);
    expect(hit("b", 1, 1000, 0)).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first hop from X-Forwarded-For", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" } });
    expect(clientIp(req)).toBe("1.1.1.1");
  });

  it("falls back to unknown with no proxy headers", () => {
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});

describe("enforce", () => {
  it("returns null while under the limit and a 429 once over", async () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "9.9.9.9" } });
    expect(enforce(req, "t", 1, 1000)).toBeNull();
    const blocked = enforce(req, "t", 1, 1000);
    expect(blocked).not.toBeNull();
    if (blocked) {
      expect(blocked.status).toBe(429);
      expect((await blocked.json()).error).toMatch(/too many/i);
    }
  });
});
