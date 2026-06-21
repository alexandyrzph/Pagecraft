import { prisma } from "@/lib/prisma";
import { withSiteRole } from "@/lib/api/api-handler";
import { json, notFound } from "@/lib/api/api-response";
import { verifyDns } from "@/lib/domains/verify";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withSiteRole("ADMIN", async (ctx) => {
    const domain = await prisma.domain.findFirst({ where: { id, siteId: ctx.site.id } });
    if (!domain) return notFound();
    await prisma.domain.update({
      where: { id },
      data: { status: "VERIFYING", lastCheckedAt: new Date() },
    });
    const result = await verifyDns(domain.hostname, domain.verificationToken);
    const updated = await prisma.domain.update({
      where: { id },
      data: result.ok
        ? { status: "ACTIVE", verifiedAt: new Date(), lastError: null }
        : { status: "ERROR", lastError: result.error },
    });
    return json({ domain: updated, routing: result.routing });
  });
}
