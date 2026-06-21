"use client";

import { cn } from "@/lib/utils";
import type { BlockRenderProps } from "@/lib/blocks/registry-types";
import { useProducts } from "@/components/store/products-context";
import { formatMoney } from "@/lib/commerce/pricing";

export function ProductGridBlock({ block, editable, style, className, id }: BlockRenderProps) {
  const { map } = useProducts();
  const { columns = "3" } = block.props as { columns?: string };
  const products = Object.values(map).filter((p) => p.status === "active");
  const cols = Math.max(1, Math.min(Number(columns) || 3, 4));

  if (products.length === 0) {
    if (!editable) return null;
    return (
      <section id={id} className={cn("w-full", className)} style={style}>
        <div className="mx-auto max-w-6xl px-6 py-16 text-center text-sm text-slate-400">
          No active products yet — add products in the Store admin.
        </div>
      </section>
    );
  }

  return (
    <section id={id} className={cn("w-full", className)} style={style}>
      <div
        className="mx-auto grid max-w-6xl gap-6 px-6 py-16"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {products.map((p) => {
          const href = editable ? undefined : `/store/${p.handle}`;
          const Tag = (href ? "a" : "div") as React.ElementType;
          return (
            <Tag
              key={p.id}
              {...(href ? { href } : {})}
              className="group flex flex-col overflow-hidden border border-slate-200 bg-white no-underline shadow-sm transition-shadow hover:shadow-md"
              style={{ borderRadius: "var(--pc-radius, 16px)" }}
            >
              {p.images[0] && (
                <div className="aspect-[4/5] w-full overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.images[0].url}
                    alt={p.images[0].alt || p.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-base font-semibold text-slate-900">{p.title}</h3>
                {p.minPrice && (
                  <div className="mt-1 text-sm text-slate-500">
                    {formatMoney(p.minPrice.amount, p.minPrice.currency)}
                  </div>
                )}
              </div>
            </Tag>
          );
        })}
      </div>
    </section>
  );
}
