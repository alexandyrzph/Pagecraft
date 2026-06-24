import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { runSetup } from "@/lib/setup/run-setup";

const prisma = new PrismaClient();
const users: string[] = [];
const wss: string[] = [];

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: wss } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});

describe("runSetup", () => {
  it("creates a workspace + site for a fresh user", async () => {
    const user = await prisma.user.create({ data: { email: `s-${Date.now()}@t.dev`, name: "T" } });
    users.push(user.id);

    const r = await runSetup(user.id, {
      workspace: { name: "Acme", logoUrl: "/w.png" },
      site: { name: "Marketing", faviconUrl: "/f.ico" },
    });
    wss.push(r.workspaceId);

    const sites = await prisma.site.findMany({ where: { workspaceId: r.workspaceId } });
    expect(sites).toHaveLength(1);
    expect(sites[0].id).toBe(r.siteId);
    expect(sites[0].faviconUrl).toBe("/f.ico");
  });

  it("rejects when workspace is null and the user has no membership", async () => {
    const user = await prisma.user.create({ data: { email: `s3-${Date.now()}@t.dev`, name: "T" } });
    users.push(user.id);
    await expect(runSetup(user.id, { workspace: null, site: { name: "X" } })).rejects.toThrow(
      "no_workspace",
    );
  });

  it("adds a site to the existing workspace when workspace is null", async () => {
    const user = await prisma.user.create({ data: { email: `s2-${Date.now()}@t.dev`, name: "T" } });
    users.push(user.id);
    const first = await runSetup(user.id, { workspace: { name: "Solo" }, site: { name: "A" } });
    wss.push(first.workspaceId);

    const second = await runSetup(user.id, { workspace: null, site: { name: "B" } });
    expect(second.workspaceId).toBe(first.workspaceId);
    const sites = await prisma.site.findMany({ where: { workspaceId: first.workspaceId } });
    expect(sites.map((s) => s.name).sort()).toEqual(["A", "B"]);
  });
});
