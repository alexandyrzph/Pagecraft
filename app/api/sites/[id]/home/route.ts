import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/api/api-handler";
import { json, badRequest, notFound } from "@/lib/api/api-response";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withRole("EDITOR", async (ws) => {
    const site = await prisma.site.findFirst({ where: { id, workspaceId: ws.workspace.id } });
    if (!site) return notFound();
    const body = await req.json().catch(() => ({}));
    const page = await prisma.page.findFirst({
      where: { id: String(body?.pageId ?? ""), siteId: id },
    });
    if (!page) return badRequest("Page not in this site");
    const updated = await prisma.site.update({ where: { id }, data: { homePageId: page.id } });
    return json(updated);
  });
}
