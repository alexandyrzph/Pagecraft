import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildProductMap } from "@/lib/commerce/product-service";
import { formatMoney } from "@/lib/commerce/pricing";
import { parseContent } from "@/lib/page-service";
import { applyTokens } from "@/lib/cms/cms-tokens";
import { resolveStoreSiteId, loadStorefront } from "@/lib/store/storefront";
import { StorefrontPage } from "@/components/store/StorefrontPage";

export const dynamic = "force-dynamic";

export default async function ProductDetail({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const siteId = await resolveStoreSiteId();
  if (!siteId) notFound();
  const { site, store } = await loadStorefront(siteId);

  const product = await prisma.product.findFirst({
    where: { siteId, handle, status: "active" },
    include: {
      variants: { orderBy: { position: "asc" } },
      images: { orderBy: { position: "asc" } },
    },
  });
  if (!product) notFound();

  const map = buildProductMap([product]);
  const sp = map[product.id];
  const tokenData: Record<string, string> = {
    title: sp.title,
    description: sp.description,
    price: sp.minPrice ? formatMoney(sp.minPrice.amount, sp.minPrice.currency) : "",
    image: sp.images[0]?.url ?? "",
    ...sp.data,
  };

  const templateRaw = parseContent(store.productTemplate);
  const template = templateRaw.length
    ? templateRaw
    : [
        {
          id: "auto-product",
          type: "product",
          props: { productId: product.id },
          styles: {},
          children: [],
        },
      ];
  const tree = applyTokens(template, tokenData);

  return <StorefrontPage site={site} map={map} content={tree} />;
}
