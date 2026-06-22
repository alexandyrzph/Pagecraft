"use client";

import { cn } from "@/lib/utils";
import type { BlockRenderProps } from "@/lib/blocks/registry-types";
import {
  ProductDetails,
  ProductImage,
  ProductPlaceholder,
  useProductState,
} from "@/components/blocks/product.helpers";

export function ProductBlock({ block, editable, style, className, id }: BlockRenderProps) {
  const { productId = "" } = block.props as { productId?: string };
  const { product, selected, setSelected, addItem } = useProductState(productId);

  if (!product) {
    if (!editable) return null;
    return <ProductPlaceholder id={id} className={className} style={style} />;
  }

  return (
    <section id={id} className={cn("w-full", className)} style={style}>
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2">
        <ProductImage product={product} />
        <ProductDetails
          product={product}
          selected={selected}
          onSelect={(name, value) => setSelected((s) => ({ ...s, [name]: value }))}
          editable={editable}
          onAdd={(variantId) => addItem(variantId)}
        />
      </div>
    </section>
  );
}
