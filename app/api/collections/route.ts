import { prisma } from "@/lib/prisma";
import { slugifyKey } from "@/lib/cms/cms";
import { serializeCollection } from "@/lib/cms/collection-service";
import { withSite, withSiteRole } from "@/lib/api/api-handler";
import { json, created } from "@/lib/api/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  return withSite(async (ctx) => {
    const collections = await prisma.collection.findMany({
      where: { siteId: ctx.site.id },
      orderBy: { createdAt: "asc" },
      include: { items: { orderBy: { order: "asc" } } },
    });
    return json(collections.map(serializeCollection));
  });
}

export async function POST(req: Request) {
  return withSiteRole("EDITOR", async (ctx) => {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "Collection").slice(0, 80);

    const base = slugifyKey(name);
    let slug = base;
    let n = 2;
    while (await prisma.collection.findFirst({ where: { siteId: ctx.site.id, slug } }))
      slug = `${base}-${n++}`;

    const fields = JSON.stringify([{ key: "title", label: "Title", type: "text" }]);
    const c = await prisma.collection.create({
      data: { name, slug, fields, siteId: ctx.site.id },
      include: { items: true },
    });
    return created(serializeCollection(c));
  });
}
