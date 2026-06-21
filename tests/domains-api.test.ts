import { describe, it, expect, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

const state = vi.hoisted(() => ({ siteId: "" }));

vi.mock("@/lib/api/api-handler", () => ({
  withSite: (fn: (c: { site: { id: string } }) => unknown) => fn({ site: { id: state.siteId } }),
  withSiteRole: (_min: string, fn: (c: { site: { id: string } }) => unknown) =>
    fn({ site: { id: state.siteId } }),
}));

const prisma = new PrismaClient();
const wsIds: string[] = [];

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: wsIds } } });
  await prisma.$disconnect();
});

describe("POST /api/domains", () => {
  it("rejects an invalid host, creates a valid one, and 409s a duplicate", async () => {
    const ws = await prisma.workspace.create({ data: { name: "T", slug: `t-${Date.now()}` } });
    wsIds.push(ws.id);
    const site = await prisma.site.create({ data: { workspaceId: ws.id, name: "S", handle: "s" } });
    state.siteId = site.id;
    const { POST } = await import("@/app/api/domains/route");

    const bad = await POST(
      new Request("http://x/api/domains", {
        method: "POST",
        body: JSON.stringify({ hostname: "127.0.0.1" }),
      }),
    );
    expect(bad.status).toBe(400);

    const ok = await POST(
      new Request("http://x/api/domains", {
        method: "POST",
        body: JSON.stringify({ hostname: `d-${Date.now()}.example` }),
      }),
    );
    expect(ok.status).toBe(201);
    const body = await ok.json();
    expect(body.domain.status).toBe("PENDING");
    expect(body.dns.ownership.type).toBe("TXT");

    const dupHost = body.domain.hostname;
    const dup = await POST(
      new Request("http://x/api/domains", {
        method: "POST",
        body: JSON.stringify({ hostname: dupHost }),
      }),
    );
    expect(dup.status).toBe(409);
  });
});
