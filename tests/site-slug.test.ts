import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { uniqueSlug } from "@/lib/page-service";

const prisma = new PrismaClient();
const cleanup: { sites: string[]; ws: string[] } = { sites: [], ws: [] };

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: cleanup.ws } } });
  await prisma.$disconnect();
});

describe("uniqueSlug (site-scoped)", () => {
  it("suffixes within a site but allows the same slug in another site", async () => {
    const ws = await prisma.workspace.create({ data: { name: "T", slug: `t-${Date.now()}` } });
    cleanup.ws.push(ws.id);
    const a = await prisma.site.create({ data: { workspaceId: ws.id, name: "A", handle: "a" } });
    const b = await prisma.site.create({ data: { workspaceId: ws.id, name: "B", handle: "b" } });
    expect(await uniqueSlug(a.id, "About Us")).toBe("about-us");
    await prisma.page.create({ data: { title: "About", slug: "about-us", siteId: a.id } });
    expect(await uniqueSlug(a.id, "About Us")).toBe("about-us-2");
    expect(await uniqueSlug(b.id, "About Us")).toBe("about-us");
  });
});
