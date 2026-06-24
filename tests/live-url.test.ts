import { describe, it, expect } from "vitest";
import { activeDomainHost, liveUrl } from "@/lib/domains/live-url";

describe("activeDomainHost", () => {
  it("prefers the primary ACTIVE domain", () => {
    expect(
      activeDomainHost([
        { hostname: "a.com", status: "ACTIVE" },
        { hostname: "b.com", status: "ACTIVE", isPrimary: true },
      ]),
    ).toBe("b.com");
  });
  it("falls back to the first ACTIVE when none is primary", () => {
    expect(
      activeDomainHost([
        { hostname: "p.com", status: "PENDING" },
        { hostname: "a.com", status: "ACTIVE" },
      ]),
    ).toBe("a.com");
  });
  it("returns null when there is no active domain", () => {
    expect(activeDomainHost([{ hostname: "p.com", status: "PENDING" }])).toBe(null);
    expect(activeDomainHost([{ status: "ACTIVE" }])).toBe(null);
    expect(activeDomainHost([])).toBe(null);
    expect(activeDomainHost(null)).toBe(null);
  });
});

describe("liveUrl", () => {
  it("builds https://<host>/p/<slug>", () => {
    expect(liveUrl("acme.com", "about")).toBe("https://acme.com/p/about");
    expect(liveUrl("acme.com", "home")).toBe("https://acme.com/p/home");
  });
});
