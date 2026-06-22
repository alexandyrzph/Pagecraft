"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductEditor, type EditableProduct } from "./ProductEditor";
import {
  useStoreAdminState,
  reloadProducts,
  connectStripe,
  newProductDraft,
  deleteProductById,
  type Store,
} from "./StoreAdmin.helpers";
import { StripePanel, ProductTable } from "./StoreAdmin.parts";

export function StoreAdmin({
  initialStore,
  initialProducts,
}: {
  initialStore: Store;
  initialProducts: EditableProduct[];
}) {
  const {
    confirm,
    alert,
    store,
    products,
    setProducts,
    editing,
    setEditing,
    connecting,
    setConnecting,
  } = useStoreAdminState(initialStore, initialProducts);

  const reload = () => reloadProducts(setProducts);
  const connect = () => connectStripe(setConnecting, alert);
  const openNewProduct = () => setEditing(newProductDraft());
  const deleteProduct = (id: string) => deleteProductById(id, confirm, alert, setEditing, reload);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Store</h1>
        <Button variant="neutral" onPress={openNewProduct} leadingIcon={<Plus size={15} />}>
          New product
        </Button>
      </div>

      <StripePanel store={store} connecting={connecting} onConnect={connect} />

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-400">
          No products yet.
        </p>
      ) : (
        <ProductTable products={products} onEdit={setEditing} onDelete={deleteProduct} />
      )}

      <ProductEditor
        product={editing}
        onSaved={(updated) => {
          setProducts((list) => {
            const exists = list.some((p) => p.id === updated.id);
            return exists
              ? list.map((p) => (p.id === updated.id ? updated : p))
              : [updated, ...list];
          });
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
        onDelete={deleteProduct}
      />
    </div>
  );
}
