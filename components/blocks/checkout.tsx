"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BlockRenderProps } from "@/lib/blocks/registry-types";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

export function CheckoutBlock({ block, editable, style, className, id }: BlockRenderProps) {
  const { label = "Checkout" } = block.props as { label?: string };
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const { data } = await api.post<{ url: string }>(endpoints.checkout.create, {});
      if (data.url) window.location.href = data.url;
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      id={id}
      className={cn(
        "rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50",
        className,
      )}
      style={style}
      disabled={editable || busy}
      onClick={go}
    >
      {busy ? "Redirecting…" : String(label)}
    </button>
  );
}
