import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveHostSite } from "@/lib/domains/resolve";
import { requestHost } from "@/lib/domains/request-host";
import { getActiveSite } from "@/lib/auth/site";
import { buildProductMap } from "@/lib/commerce/product-service";
import { parseContent } from "@/lib/page-service";
import { parseDesignSystem, designSystemCss } from "@/lib/design/design-system";
import { responsiveCss } from "@/lib/blocks/styles";
import { ProductsProvider } from "@/components/store/products-context";
import { CartProvider } from "@/components/store/cart-context";
import { BlockRenderer } from "@/components/BlockRenderer";

export const dynamic = "force-dynamic";

async function resolveStoreSiteId(): Promise<string | null> {
  const resolved = await resolveHostSite(await requestHost());
  if (resolved) return resolved.siteId;
  const ctx = await getActiveSite();
  return ctx?.site.id ?? null;
}

export default async function StoreIndex() {
  const siteId = await resolveStoreSiteId();
  if (!siteId) notFound();
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  const store = await prisma.store.findUnique({ where: { siteId } });
  if (!site || !store) notFound();

  const products = await prisma.product.findMany({
    where: { siteId, status: "active" },
    include: {
      variants: { orderBy: { position: "asc" } },
      images: { orderBy: { position: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  const map = buildProductMap(products);

  const header = parseContent(site.header);
  const footer = parseContent(site.footer);
  const grid = [
    { id: "store-grid", type: "product-grid", props: { columns: "3" }, styles: {}, children: [] },
  ];
  const ds = parseDesignSystem(site);
  const css =
    designSystemCss(ds.colors, ds.textStyles) +
    "\n" +
    responsiveCss([...header, ...grid, ...footer]);

  return (
    <ProductsProvider value={{ map }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <CartProvider>
        <main>
          {header.length > 0 && (
            <BlockRenderer
              tree={header}
              viewport="desktop"
              animate
              inlineStyles={false}
              products={map}
            />
          )}
          <BlockRenderer
            tree={grid}
            viewport="desktop"
            animate
            inlineStyles={false}
            products={map}
          />
          {footer.length > 0 && (
            <BlockRenderer
              tree={footer}
              viewport="desktop"
              animate
              inlineStyles={false}
              products={map}
            />
          )}
        </main>
      </CartProvider>
    </ProductsProvider>
  );
}
