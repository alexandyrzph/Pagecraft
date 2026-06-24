import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createWorkspace } from "@/lib/auth/workspace";

const prisma = new PrismaClient();
const users: string[] = [];
const wss: string[] = [];

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: wss } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});

describe("createWorkspace", () => {
  it("creates a workspace + OWNER membership but no site", async () => {
    const user = await prisma.user.create({ data: { email: `cw-${Date.now()}@t.dev`, name: "T" } });
    users.push(user.id);

    const ws = await createWorkspace({ userId: user.id, name: "Acme", logoUrl: "/w.png" });
    wss.push(ws.id);

    const row = await prisma.workspace.findUniqueOrThrow({ where: { id: ws.id } });
    expect(row.logoUrl).toBe("/w.png");

    const membership = await prisma.membership.findFirstOrThrow({ where: { workspaceId: ws.id } });
    expect(membership.role).toBe("OWNER");

    const sites = await prisma.site.findMany({ where: { workspaceId: ws.id } });
    expect(sites).toHaveLength(0);
  });
});
