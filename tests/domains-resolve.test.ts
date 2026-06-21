import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { lookupHostSite } from "@/lib/domains/resolve";

const prisma = new PrismaClient();
const wsIds: string[] = [];

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: wsIds } } });
  await prisma.$disconnect();
});

describe("lookupHostSite", () => {
  it("returns the site for an ACTIVE host and null otherwise", async () => {
    const ws = await prisma.workspace.create({ data: { name: "T", slug: `t-${Date.now()}` } });
    wsIds.push(ws.id);
    const site = await prisma.site.create({ data: { workspaceId: ws.id, name: "S", handle: "s" } });
    await prisma.domain.create({
      data: { siteId: site.id, hostname: "active.example", status: "ACTIVE" },
    });
    await prisma.domain.create({
      data: { siteId: site.id, hostname: "pending.example", status: "PENDING" },
    });

    const active = await lookupHostSite("HTTPS://Active.example/");
    expect(active?.siteId).toBe(site.id);
    expect(await lookupHostSite("pending.example")).toBeNull();
    expect(await lookupHostSite("unknown.example")).toBeNull();
  });
});
