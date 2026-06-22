import { prisma } from "@/lib/prisma";
import { withSite, withSiteRole } from "@/lib/api/api-handler";
import { json, created, badRequest } from "@/lib/api/api-response";
import { syncProductToStripe } from "@/lib/commerce/sync";
import { parseProductInput } from "./route.helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return withSite(async (ctx) => {
    const products = await prisma.product.findMany({
      where: { siteId: ctx.site.id },
      include: {
        variants: { orderBy: { position: "asc" } },
        images: { orderBy: { position: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return json({ products });
  });
}

export async function POST(req: Request) {
  return withSiteRole("EDITOR", async (ctx) => {
    const body = await req.json().catch(() => ({}));
    const input = parseProductInput(body);
    if (!input.base) return badRequest("Invalid handle");

    let handle = input.base;
    if (input.explicitHandle) {
      const existing = await prisma.product.findUnique({
        where: { siteId_handle: { siteId: ctx.site.id, handle } },
      });
      if (existing) return json({ error: "That handle is already in use" }, 409);
    } else {
      let n = 1;
      while (
        await prisma.product.findUnique({
          where: { siteId_handle: { siteId: ctx.site.id, handle } },
        })
      ) {
        n += 1;
        handle = `${input.base}-${n}`.slice(0, 80);
      }
    }

    const product = await prisma.product.create({
      data: {
        siteId: ctx.site.id,
        handle,
        title: input.title,
        description: input.description,
        status: input.status,
        variants: {
          create: {
            siteId: ctx.site.id,
            title: "Default",
            priceAmount: input.priceAmount,
            inventory: input.inventory,
          },
        },
        images: { create: input.imageData },
      },
      include: { variants: true, images: true },
    });
    await syncProductToStripe(ctx.site.id, product.id).catch(() => {});
    return created({ product });
  });
}
