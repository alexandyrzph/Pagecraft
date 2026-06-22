import { parseContent } from "@/lib/page-service";
import { parseDesignSystem, designSystemCss } from "@/lib/design/design-system";
import { responsiveCss } from "@/lib/blocks/styles";
import { ProductsProvider } from "@/components/store/products-context";
import { CartProvider } from "@/components/store/cart-context";
import { BlockRenderer } from "@/components/BlockRenderer";
import type { Block } from "@/lib/types";
import type { ProductMap } from "@/lib/commerce/product-service";

type StorefrontSite = {
  header: string;
  footer: string;
  colors?: string | null;
  textStyles?: string | null;
};

export function StorefrontPage({
  site,
  map,
  content,
}: {
  site: StorefrontSite;
  map: ProductMap;
  content: Block[];
}) {
  const header = parseContent(site.header);
  const footer = parseContent(site.footer);
  const ds = parseDesignSystem(site);
  const css =
    designSystemCss(ds.colors, ds.textStyles) +
    "\n" +
    responsiveCss([...header, ...content, ...footer]);

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
            tree={content}
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
