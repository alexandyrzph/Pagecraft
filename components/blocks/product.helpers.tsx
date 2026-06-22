"use client";

import { useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/commerce/pricing";
import { useProducts } from "@/components/store/products-context";
import { useCart } from "@/components/store/cart-context";
import type { StoreProduct, StoreVariant, ProductMap } from "@/lib/commerce/product-service";

export function variantForSelected(
  variants: StoreVariant[],
  selected: Record<string, string>,
): string | null {
  const keys = Object.keys(selected);
  for (const v of variants) {
    if (keys.every((k) => v.options[k] === selected[k])) return v.id;
  }
  return null;
}

export function resolveProduct(map: ProductMap, productId: string): StoreProduct | undefined {
  return productId ? map[productId] : Object.values(map)[0];
}

export function optionNamesFor(variants: StoreVariant[]): string[] {
  return Array.from(new Set(variants.flatMap((v) => Object.keys(v.options))));
}

export function optionValuesFor(variants: StoreVariant[], name: string): string[] {
  return Array.from(new Set(variants.map((v) => v.options[name]).filter(Boolean)));
}

export function resolveMatchedVariant(
  variants: StoreVariant[],
  selected: Record<string, string>,
): StoreVariant | undefined {
  const matchedId = variantForSelected(variants, selected) ?? variants[0]?.id;
  return variants.find((v) => v.id === matchedId) ?? variants[0];
}

export function isOutOfStock(variant: StoreVariant): boolean {
  return variant.inventory === 0 && variant.inventoryPolicy === "deny";
}

export type ProductState = {
  product: StoreProduct | undefined;
  selected: Record<string, string>;
  setSelected: Dispatch<SetStateAction<Record<string, string>>>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
};

export function useProductState(productId: string): ProductState {
  const { map } = useProducts();
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Record<string, string>>({});
  return { product: resolveProduct(map, productId), selected, setSelected, addItem };
}

export function ProductPlaceholder({
  id,
  className,
  style,
}: {
  id?: string;
  className: string;
  style: CSSProperties;
}) {
  return (
    <section id={id} className={cn("w-full", className)} style={style}>
      <div className="mx-auto max-w-5xl px-6 py-16 text-center text-sm text-slate-400">
        Product block — open this on a product page, or pick a product in the inspector.
      </div>
    </section>
  );
}

export function ProductImage({ product }: { product: StoreProduct }) {
  const image = product.images[0];
  return (
    <div className="overflow-hidden rounded-2xl bg-slate-100">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={image.alt || product.title}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}

function OptionSelect({
  name,
  values,
  value,
  onChange,
}: {
  name: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-6">
      <label className="text-sm font-medium text-slate-700">{name}</label>
      <select
        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
}

function AddToCartButton({
  matched,
  editable,
  onAdd,
}: {
  matched: StoreVariant;
  editable: boolean;
  onAdd: () => void;
}) {
  const outOfStock = isOutOfStock(matched);
  return (
    <button
      className="mt-8 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      disabled={editable || outOfStock}
      onClick={onAdd}
    >
      {outOfStock ? "Out of stock" : "Add to cart"}
    </button>
  );
}

export function ProductDetails({
  product,
  selected,
  onSelect,
  editable,
  onAdd,
}: {
  product: StoreProduct;
  selected: Record<string, string>;
  onSelect: (name: string, value: string) => void;
  editable: boolean;
  onAdd: (variantId: string) => void;
}) {
  const matched = resolveMatchedVariant(product.variants, selected);
  return (
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
      {optionNamesFor(product.variants).map((name) => (
        <OptionSelect
          key={name}
          name={name}
          values={optionValuesFor(product.variants, name)}
          value={selected[name] ?? ""}
          onChange={(value) => onSelect(name, value)}
        />
      ))}
      {matched && (
        <AddToCartButton matched={matched} editable={editable} onAdd={() => onAdd(matched.id)} />
      )}
    </div>
  );
}
