import { prisma } from "@/lib/prisma";
import { withSiteRole } from "@/lib/api/api-handler";
import { json, notFound } from "@/lib/api/api-response";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withSiteRole("EDITOR", async (ctx) => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const published = body.published !== false;

    const result = await prisma.page.updateMany({
      where: { id, siteId: ctx.site.id },
      data: { published },
    });
    if (result.count === 0) return notFound();
    const page = await prisma.page.findFirst({ where: { id, siteId: ctx.site.id } });
    await logActivity(ctx.workspace.id, ctx.user.id, "page.published", id);
    return json({ published, slug: page?.slug });
  });
}
