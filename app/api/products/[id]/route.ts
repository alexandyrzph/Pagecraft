import { prisma } from "@/lib/prisma";
import { withSite, withSiteRole } from "@/lib/api/api-handler";
import { json, notFound } from "@/lib/api/api-response";
import { syncProductToStripe } from "@/lib/commerce/sync";
import { pickProductData, pickVariantData, buildImageRows } from "@/lib/commerce/product-input";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withSite(async (ctx) => {
    const product = await prisma.product.findFirst({
      where: { id, siteId: ctx.site.id },
      include: {
        variants: { orderBy: { position: "asc" } },
        images: { orderBy: { position: "asc" } },
      },
    });
    if (!product) return notFound();
    return json({ product });
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withSiteRole("EDITOR", async (ctx) => {
    const product = await prisma.product.findFirst({ where: { id, siteId: ctx.site.id } });
    if (!product) return notFound();
    const body = await req.json().catch(() => ({}));

    const data = pickProductData(body);
    if (Object.keys(data).length) await prisma.product.update({ where: { id }, data });

    if (Array.isArray(body?.variants)) {
      for (const v of body.variants) {
        if (typeof v?.id !== "string") continue;
        await prisma.productVariant.updateMany({
          where: { id: v.id, productId: id, siteId: ctx.site.id },
          data: pickVariantData(v),
        });
      }
    }

    if (Array.isArray(body?.images)) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      await prisma.productImage.createMany({ data: buildImageRows(body.images, id) });
    }

    await syncProductToStripe(ctx.site.id, id).catch(() => {});
    const updated = await prisma.product.findFirst({
      where: { id, siteId: ctx.site.id },
      include: {
        variants: { orderBy: { position: "asc" } },
        images: { orderBy: { position: "asc" } },
      },
    });
    if (!updated) return notFound();
    return json({ product: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withSiteRole("EDITOR", async (ctx) => {
    const product = await prisma.product.findFirst({ where: { id, siteId: ctx.site.id } });
    if (!product) return notFound();
    await prisma.product.delete({ where: { id } });
    return json({ ok: true });
  });
}
