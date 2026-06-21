import { prisma } from "@/lib/prisma";
import { withSite, withSiteRole } from "@/lib/api/api-handler";
import { json, created } from "@/lib/api/api-response";
import { parseJsonArray } from "@/lib/api/json-parse";

export const dynamic = "force-dynamic";

export async function GET() {
  return withSite(async (ctx) => {
    const comps = await prisma.component.findMany({
      where: { siteId: ctx.site.id },
      orderBy: { updatedAt: "desc" },
    });
    return json(
      comps.map((c) => ({
        id: c.id,
        name: c.name,
        content: parseJsonArray(c.content),
        updatedAt: c.updatedAt.toISOString(),
      })),
    );
  });
}

export async function POST(req: Request) {
  return withSiteRole("EDITOR", async (ctx) => {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "Component").slice(0, 80);
    const content = JSON.stringify(Array.isArray(body.content) ? body.content : []);
    const c = await prisma.component.create({
      data: { name, content, siteId: ctx.site.id },
    });
    return created({ id: c.id, name: c.name, content: parseJsonArray(c.content) });
  });
}
