import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const cleanup: string[] = [];

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: cleanup } } });
  await prisma.$disconnect();
});

describe("site branding + page noindex columns", () => {
  it("persists logoUrl, faviconUrl and noindex", async () => {
    const ws = await prisma.workspace.create({
      data: { name: "B", slug: `brand-${Date.now()}` },
    });
    cleanup.push(ws.id);
    const site = await prisma.site.create({
      data: { workspaceId: ws.id, name: "S", handle: "s", logoUrl: "/l.png", faviconUrl: "/f.ico" },
    });
    const page = await prisma.page.create({
      data: { title: "P", slug: "p", siteId: site.id, noindex: true },
    });
    expect(site.logoUrl).toBe("/l.png");
    expect(site.faviconUrl).toBe("/f.ico");
    expect(page.noindex).toBe(true);
  });
});
