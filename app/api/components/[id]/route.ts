import { prisma } from "@/lib/prisma";
import { withSite, withSiteRole } from "@/lib/api/api-handler";
import { json, notFound } from "@/lib/api/api-response";
import { parseJsonArray } from "@/lib/api/json-parse";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return withSite(async (ctx) => {
    const { id } = await params;
    const c = await prisma.component.findFirst({ where: { id, siteId: ctx.site.id } });
    if (!c) return notFound();
    return json({ id: c.id, name: c.name, content: parseJsonArray(c.content) });
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  return withSiteRole("EDITOR", async (ctx) => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data: { name?: string; content?: string } = {};
    if (typeof body.name === "string") data.name = body.name.slice(0, 80);
    if (body.content !== undefined) data.content = JSON.stringify(body.content);
    const result = await prisma.component.updateMany({
      where: { id, siteId: ctx.site.id },
      data,
    });
    if (result.count === 0) return notFound();
    const c = await prisma.component.findFirst({ where: { id, siteId: ctx.site.id } });
    if (!c) return notFound();
    return json({ id: c.id, name: c.name, content: parseJsonArray(c.content) });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return withSiteRole("EDITOR", async (ctx) => {
    const { id } = await params;
    const result = await prisma.component.deleteMany({
      where: { id, siteId: ctx.site.id },
    });
    if (result.count === 0) return notFound();
    return json({ ok: true });
  });
}
