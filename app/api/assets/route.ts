import { prisma } from "@/lib/prisma";
import { withSite } from "@/lib/api/api-handler";
import { json } from "@/lib/api/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withSite(async (ctx) => {
    const kind = new URL(req.url).searchParams.get("kind");
    const assets = await prisma.asset.findMany({
      where: { siteId: ctx.site.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const filtered = kind === "image" ? assets.filter((x) => x.type.startsWith("image/")) : assets;
    return json(
      filtered.map((x) => ({ id: x.id, url: x.url, name: x.name, type: x.type, size: x.size })),
    );
  });
}
