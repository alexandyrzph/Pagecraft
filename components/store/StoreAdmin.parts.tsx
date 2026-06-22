"use client";

import { Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/commerce/pricing";
import { Button } from "@/components/ui/Button";
import { Table, TableContainer, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { type EditableProduct } from "./ProductEditor";
import { type Store } from "./StoreAdmin.helpers";

const STATUS_PILL: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  draft: "bg-zinc-100 text-zinc-600",
  archived: "bg-amber-50 text-amber-700",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
        STATUS_PILL[status] ?? STATUS_PILL.draft
      }`}
    >
      {status}
    </span>
  );
}

export function StripePanel({
  store,
  connecting,
  onConnect,
}: {
  store: Store;
  connecting: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="mb-8 rounded-xl border border-border p-4">
      <div className="text-sm font-semibold text-fg">Stripe</div>
      {store?.chargesEnabled ? (
        <div className="mt-1 text-sm font-medium text-green-600">Connected — charges enabled</div>
      ) : (
        <Button variant="secondary" className="mt-2" onPress={onConnect} isLoading={connecting}>
          {store?.stripeAccountId ? "Finish Stripe onboarding" : "Connect Stripe"}
        </Button>
      )}
    </div>
  );
}

export function ProductTable({
  products,
  onEdit,
  onDelete,
}: {
  products: EditableProduct[];
  onEdit: (product: EditableProduct) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <TableContainer>
      <Table>
        <THead>
          <tr>
            <TH>Product</TH>
            <TH>Status</TH>
            <TH>Price</TH>
            <TH>Inventory</TH>
            <TH className="text-right">
              <span className="sr-only">Actions</span>
            </TH>
          </tr>
        </THead>
        <TBody>
          {products.map((p) => {
            const v = p.variants[0];
            return (
              <TR key={p.id} className="group">
                <TD className="max-w-[260px] truncate font-medium text-zinc-900" title={p.title}>
                  {p.title}
                </TD>
                <TD>
                  <StatusPill status={p.status} />
                </TD>
                <TD className="tabular-nums">
                  {v ? (
                    formatMoney(v.priceAmount, v.currency)
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </TD>
                <TD className="tabular-nums">
                  {v ? v.inventory : <span className="text-zinc-300">—</span>}
                </TD>
                <TD className="w-px whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => onEdit(p)}
                      className="text-brand-600 hover:bg-brand-50"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete product"
                      onPress={() => onDelete(p.id)}
                      className="text-fg-subtle hover:bg-danger-50 hover:text-danger-500"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableContainer>
  );
}
