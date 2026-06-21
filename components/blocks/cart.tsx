"use client";

import { cn } from "@/lib/utils";
import type { BlockRenderProps } from "@/lib/blocks/registry-types";
import { useCart } from "@/components/store/cart-context";
import { cartSubtotal } from "@/lib/commerce/cart";
import { formatMoney } from "@/lib/commerce/pricing";

export function CartBlock({ style, className, id }: BlockRenderProps) {
  const { cart, updateItem, removeItem } = useCart();
  const subtotal = cartSubtotal(cart.items);
  return (
    <section id={id} className={cn("w-full", className)} style={style}>
      <div className="mx-auto max-w-2xl px-6 py-12">
        {cart.items.length === 0 ? (
          <p className="text-center text-sm text-slate-400">Your cart is empty.</p>
        ) : (
          <>
            {cart.items.map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b py-3">
                <span className="text-sm">{i.variantId.slice(0, 6)}</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    className="w-16 rounded border px-2 py-1"
                    value={i.quantity}
                    onChange={(e) => updateItem(i.id, Number(e.target.value))}
                  />
                  <span className="w-20 text-right text-sm">
                    {formatMoney(i.unitAmount * i.quantity, "usd")}
                  </span>
                  <button className="text-xs text-red-500" onClick={() => removeItem(i.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="mt-4 flex justify-between text-base font-semibold">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal, "usd")}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
