"use client";

import { cn } from "@/lib/utils";
import type { BlockRenderProps } from "@/lib/blocks/registry-types";
import { useCart } from "@/components/store/cart-context";

export function AddToCartBlock({ block, editable, style, className, id }: BlockRenderProps) {
  const { addItem } = useCart();
  const { variantId = "", label = "Add to cart" } = block.props as {
    variantId?: string;
    label?: string;
  };
  return (
    <button
      id={id}
      className={cn(
        "rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50",
        className,
      )}
      style={style}
      disabled={editable || !variantId}
      onClick={() => variantId && addItem(variantId, 1)}
    >
      {String(label)}
    </button>
  );
}
