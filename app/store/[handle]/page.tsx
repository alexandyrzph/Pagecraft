import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveHostSite } from "@/lib/domains/resolve";
import { requestHost } from "@/lib/domains/request-host";
import { getActiveSite } from "@/lib/auth/site";
import { buildProductMap } from "@/lib/commerce/product-service";
import { formatMoney } from "@/lib/commerce/pricing";
import { parseContent } from "@/lib/page-service";
import { applyTokens } from "@/lib/cms/cms-tokens";
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

export default async function ProductDetail({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const siteId = await resolveStoreSiteId();
  if (!siteId) notFound();
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  const store = await prisma.store.findUnique({ where: { siteId } });
  if (!site || !store) notFound();

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

  const header = parseContent(site.header);
  const footer = parseContent(site.footer);
  const ds = parseDesignSystem(site);
  const css =
    designSystemCss(ds.colors, ds.textStyles) +
    "\n" +
    responsiveCss([...header, ...tree, ...footer]);

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
            tree={tree}
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
