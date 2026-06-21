"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BlockRenderProps } from "@/lib/blocks/registry-types";
import { useProducts } from "@/components/store/products-context";
import { formatMoney } from "@/lib/commerce/pricing";
import type { StoreVariant } from "@/lib/commerce/product-service";

function variantForSelected(
  variants: StoreVariant[],
  selected: Record<string, string>,
): string | null {
  const keys = Object.keys(selected);
  for (const v of variants) {
    if (keys.every((k) => v.options[k] === selected[k])) return v.id;
  }
  return null;
}

export function ProductBlock({ block, editable, style, className, id }: BlockRenderProps) {
  const { map } = useProducts();
  const { productId = "" } = block.props as { productId?: string };
  const product = productId ? map[productId] : Object.values(map)[0];
  const [selected, setSelected] = useState<Record<string, string>>({});

  if (!product) {
    if (!editable) return null;
    return (
      <section id={id} className={cn("w-full", className)} style={style}>
        <div className="mx-auto max-w-5xl px-6 py-16 text-center text-sm text-slate-400">
          Product block — open this on a product page, or pick a product in the inspector.
        </div>
      </section>
    );
  }

  const optionNames = Array.from(new Set(product.variants.flatMap((v) => Object.keys(v.options))));
  const matchedId = variantForSelected(product.variants, selected) ?? product.variants[0]?.id;
  const matched = product.variants.find((v) => v.id === matchedId) ?? product.variants[0];

  return (
    <section id={id} className={cn("w-full", className)} style={style}>
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl bg-slate-100">
          {product.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0].url}
              alt={product.images[0].alt || product.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{product.title}</h1>
          {matched && (
            <div className="mt-2 text-xl text-slate-700">
              {formatMoney(matched.priceAmount, matched.currency)}
            </div>
          )}
          {product.description && (
            <p className="mt-4 whitespace-pre-line text-slate-600">{product.description}</p>
          )}
          {optionNames.map((name) => {
            const values = Array.from(
              new Set(product.variants.map((v) => v.options[name]).filter(Boolean)),
            );
            return (
              <div key={name} className="mt-6">
                <label className="text-sm font-medium text-slate-700">{name}</label>
                <select
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={selected[name] ?? ""}
                  onChange={(e) => setSelected((s) => ({ ...s, [name]: e.target.value }))}
                >
                  <option value="">Select {name}</option>
                  {values.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          <div className="mt-8 text-xs text-slate-400" data-variant-id={matched?.id}>
            {matched && matched.inventory === 0 && matched.inventoryPolicy === "deny"
              ? "Out of stock"
              : "In stock"}
          </div>
        </div>
      </div>
    </section>
  );
}
