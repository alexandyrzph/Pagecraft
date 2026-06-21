import { ShoppingBag, Package, ShoppingCart, CreditCard } from "lucide-react";
import type { BlockDefinition } from "@/lib/blocks/registry-types";
import { ProductGridBlock } from "./product-grid";
import { ProductBlock } from "./product";
import { AddToCartBlock } from "./add-to-cart";
import { CartBlock } from "./cart";
import { CheckoutBlock } from "./checkout";

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
  {
    type: "add-to-cart",
    label: "Add to Cart",
    icon: ShoppingCart,
    category: "Commerce",
    description: "Button that adds the selected variant to the cart",
    defaultProps: { variantId: "", label: "Add to cart" },
    defaultStyles: {},
    fields: [
      {
        key: "variantId",
        label: "Variant ID",
        type: "text",
        placeholder: "auto-set by product block",
      },
      { key: "label", label: "Button label", type: "text" },
    ],
    styleGroups: ["spacing"],
    Render: AddToCartBlock,
  },
  {
    type: "cart",
    label: "Cart",
    icon: ShoppingCart,
    category: "Commerce",
    description: "Line-item cart with quantity controls and subtotal",
    defaultProps: {},
    defaultStyles: {},
    fields: [],
    styleGroups: ["background", "spacing"],
    Render: CartBlock,
  },
  {
    type: "checkout",
    label: "Checkout",
    icon: CreditCard,
    category: "Commerce",
    description: "Button that initiates Stripe Checkout",
    defaultProps: { label: "Checkout" },
    defaultStyles: {},
    fields: [{ key: "label", label: "Button label", type: "text" }],
    styleGroups: ["spacing"],
    Render: CheckoutBlock,
  },
];
