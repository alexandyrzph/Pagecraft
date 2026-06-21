import { prisma } from "@/lib/prisma";
import { parseContent } from "@/lib/page-service";
import { parseTheme } from "@/lib/design/theme";
import { withSite, withSiteRole } from "@/lib/api/api-handler";
import { json, notFound } from "@/lib/api/api-response";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return withSite(async (ctx) => {
    const { id, versionId } = await params;

    const page = await prisma.page.findFirst({ where: { id, siteId: ctx.site.id } });
    if (!page) return notFound();

    const v = await prisma.pageVersion.findFirst({ where: { id: versionId, pageId: id } });
    if (!v) return notFound();
    return json({
      id: v.id,
      label: v.label,
      createdAt: v.createdAt.toISOString(),
      content: parseContent(v.content),
      theme: parseTheme(v.theme),
    });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return withSiteRole("EDITOR", async (ctx) => {
    const { id, versionId } = await params;

    const page = await prisma.page.findFirst({ where: { id, siteId: ctx.site.id } });
    if (!page) return notFound();

    const result = await prisma.pageVersion.deleteMany({ where: { id: versionId, pageId: id } });
    if (result.count === 0) return notFound();
    return json({ ok: true });
  });
}
