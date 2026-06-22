"use client";

import { useState } from "react";
import axios from "axios";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useConfirm, useAlert } from "@/components/ui/dialog-provider";
import { type EditableProduct } from "./ProductEditor";

export type Store = {
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  currency: string;
  taxEnabled: boolean;
} | null;

export function useStoreAdminState(initialStore: Store, initialProducts: EditableProduct[]) {
  const confirm = useConfirm();
  const alert = useAlert();
  const [store] = useState<Store>(initialStore);
  const [products, setProducts] = useState<EditableProduct[]>(initialProducts);
  const [editing, setEditing] = useState<EditableProduct | null>(null);
  const [connecting, setConnecting] = useState(false);
  return {
    confirm,
    alert,
    store,
    products,
    setProducts,
    editing,
    setEditing,
    connecting,
    setConnecting,
  };
}

export async function reloadProducts(setProducts: (products: EditableProduct[]) => void) {
  const r = await api
    .get<{ products: EditableProduct[] }>(endpoints.products.list)
    .then((x) => x.data.products)
    .catch(() => null);
  if (Array.isArray(r)) setProducts(r);
}

export async function connectStripe(
  setConnecting: (value: boolean) => void,
  alert: ReturnType<typeof useAlert>,
) {
  setConnecting(true);
  try {
    const { data } = await api.post<{ url: string }>(endpoints.store.connect, {});
    window.location.href = data.url;
  } catch (e) {
    const d = (axios.isAxiosError(e) ? e.response?.data : null) ?? {};
    await alert({
      title: "Couldn't connect Stripe",
      message: d.error || "Please try again.",
    });
    setConnecting(false);
  }
}

export function newProductDraft(): EditableProduct {
  return {
    id: "",
    handle: "",
    title: "New product",
    description: "",
    status: "draft",
    variants: [{ id: "", title: "Default", priceAmount: 0, currency: "", inventory: 0 }],
    images: [],
  };
}

export async function deleteProductById(
  id: string,
  confirm: ReturnType<typeof useConfirm>,
  alert: ReturnType<typeof useAlert>,
  setEditing: (product: EditableProduct | null) => void,
  reload: () => Promise<void>,
) {
  const ok = await confirm({
    title: "Delete product?",
    message: "This product and all of its variants will be permanently removed.",
    confirmLabel: "Delete",
    destructive: true,
  });
  if (!ok) return;
  try {
    await api.delete(endpoints.products.byId(id));
    setEditing(null);
    await reload();
  } catch (e) {
    const d = (axios.isAxiosError(e) ? e.response?.data : null) ?? {};
    await alert({ title: "Couldn't delete product", message: d.error || "Please try again." });
  }
}
