import { ShoppingBag, Package } from "lucide-react";
import type { BlockDefinition } from "@/lib/blocks/registry-types";
import { ProductGridBlock } from "./product-grid";
import { ProductBlock } from "./product";

export const commerceBlocks: BlockDefinition[] = [
  {
    type: "product-grid",
    label: "Product Grid",
    icon: ShoppingBag,
    category: "Commerce",
    description: "Show this store's active products in a grid",
    defaultProps: { columns: "3" },
    defaultStyles: { desktop: { backgroundColor: "#ffffff" } },
    fields: [
      {
        key: "columns",
        label: "Columns",
        type: "select",
        options: [
          { label: "2", value: "2" },
          { label: "3", value: "3" },
          { label: "4", value: "4" },
        ],
      },
    ],
    styleGroups: ["background", "spacing"],
    Render: ProductGridBlock,
  },
  {
    type: "product",
    label: "Product",
    icon: Package,
    category: "Commerce",
    description: "Render a single product with variant selector",
    defaultProps: { productId: "" },
    defaultStyles: { desktop: { backgroundColor: "#ffffff" } },
    fields: [
      {
        key: "productId",
        label: "Product ID",
        type: "text",
        placeholder: "leave blank on a product page",
      },
    ],
    styleGroups: ["background", "spacing"],
    Render: ProductBlock,
  },
];
