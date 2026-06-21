import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

async function uniqueHandle(workspaceId: string, name: string): Promise<string> {
  const base = slugify(name) || "site";
  for (let n = 1; n < 1000; n++) {
    const handle = n === 1 ? base : `${base}-${n}`;
    const existing = await prisma.site.findFirst({ where: { workspaceId, handle } });
    if (!existing) return handle;
  }
  return `${base}-${Date.now()}`;
}

export async function createSite(workspaceId: string, name: string) {
  const cleanName = (name || "Untitled site").trim().slice(0, 80) || "Untitled site";
  const handle = await uniqueHandle(workspaceId, cleanName);
  return prisma.$transaction(async (tx) => {
    const site = await tx.site.create({ data: { workspaceId, name: cleanName, handle } });
    const home = await tx.page.create({
      data: { title: "Home", slug: "home", siteId: site.id, published: false },
    });
    await tx.site.update({ where: { id: site.id }, data: { homePageId: home.id } });
    return { id: site.id, name: site.name, handle: site.handle, homePageId: home.id };
  });
}
