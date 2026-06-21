import { prisma } from "@/lib/prisma";
import { withSiteRole } from "@/lib/api/api-handler";
import { json, notFound } from "@/lib/api/api-response";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withSiteRole("ADMIN", async (ctx) => {
    const domain = await prisma.domain.findFirst({ where: { id, siteId: ctx.site.id } });
    if (!domain) return notFound();
    await prisma.domain.delete({ where: { id } });
    return json({ ok: true });
  });
}
