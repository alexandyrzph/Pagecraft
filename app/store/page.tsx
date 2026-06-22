import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildProductMap } from "@/lib/commerce/product-service";
import { resolveStoreSiteId, loadStorefront } from "@/lib/store/storefront";
import { StorefrontPage } from "@/components/store/StorefrontPage";

export const dynamic = "force-dynamic";

export default async function StoreIndex() {
  const siteId = await resolveStoreSiteId();
  if (!siteId) notFound();
  const { site } = await loadStorefront(siteId);

  const products = await prisma.product.findMany({
    where: { siteId, status: "active" },
    include: {
      variants: { orderBy: { position: "asc" } },
      images: { orderBy: { position: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  const map = buildProductMap(products);

  const grid = [
    { id: "store-grid", type: "product-grid", props: { columns: "3" }, styles: {}, children: [] },
  ];

  return <StorefrontPage site={site} map={map} content={grid} />;
}
