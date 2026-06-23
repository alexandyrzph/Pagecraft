import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  sent: [] as Array<{ to: string; url: string }>,
  created: [] as unknown[],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(async () => state.user) },
    passwordReset: { create: vi.fn(async (args: unknown) => state.created.push(args)) },
  },
}));

vi.mock("@/lib/email", () => ({
  sendPasswordReset: vi.fn(async (to: string, url: string) => {
    state.sent.push({ to, url });
  }),
}));

async function callForgot(email: unknown) {
  const { POST } = await import("@/app/api/auth/forgot/route");
  return POST(
    new Request("http://x/api/auth/forgot", {
      method: "POST",
      headers: { "x-forwarded-for": "5.5.5.5" },
      body: JSON.stringify({ email }),
    }),
  );
}

beforeEach(async () => {
  state.user = null;
  state.sent = [];
  state.created = [];
  const { resetRateLimits } = await import("@/lib/rate-limit");
  resetRateLimits();
});

describe("POST /api/auth/forgot", () => {
  it("never leaks the reset link in the response body", async () => {
    state.user = { id: "u1", email: "a@b.com" };
    const res = await callForgot("a@b.com");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(body).not.toHaveProperty("resetUrl");
  });

  it("emails the reset link when the user exists", async () => {
    state.user = { id: "u1", email: "a@b.com" };
    await callForgot("a@b.com");
    expect(state.sent).toHaveLength(1);
    expect(state.sent[0].to).toBe("a@b.com");
    expect(state.sent[0].url).toMatch(/\/reset\?token=/);
  });

  it("does not reveal whether an unknown email exists and sends nothing", async () => {
    state.user = null;
    const res = await callForgot("nobody@b.com");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(state.sent).toHaveLength(0);
  });
});
