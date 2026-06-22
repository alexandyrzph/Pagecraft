import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ProductMap, StoreProduct, StoreVariant } from "@/lib/commerce/product-service";
import type { BlockRenderProps } from "@/lib/blocks/registry-types";

const addItem = vi.fn();
let productMap: ProductMap = {};

vi.mock("@/components/store/products-context", () => ({
  useProducts: () => ({ map: productMap }),
}));

vi.mock("@/components/store/cart-context", () => ({
  useCart: () => ({ addItem }),
}));

import { ProductBlock } from "@/components/blocks/product";

function variant(over: Partial<StoreVariant> = {}): StoreVariant {
  return {
    id: "v1",
    title: "Default",
    options: {},
    priceAmount: 2500,
    currency: "usd",
    inventory: 5,
    inventoryPolicy: "deny",
    ...over,
  };
}

function product(over: Partial<StoreProduct> = {}): StoreProduct {
  return {
    id: "p1",
    handle: "tee",
    title: "Classic Tee",
    description: "",
    status: "active",
    data: {},
    images: [],
    variants: [variant()],
    minPrice: null,
    ...over,
  };
}

function renderBlock(over: Partial<BlockRenderProps> = {}) {
  const props = {
    block: { id: "b1", type: "product", props: {}, children: [] },
    viewport: "desktop",
    editable: false,
    selected: false,
    style: {},
    className: "b-b1",
    id: undefined,
    setProp: vi.fn(),
    ...over,
  } as unknown as BlockRenderProps;
  return render(<ProductBlock {...props} />);
}

beforeEach(() => {
  addItem.mockReset();
  productMap = {};
});

describe("ProductBlock — placeholder branch", () => {
  it("renders nothing when there is no product and not editable", () => {
    const { container } = renderBlock({ editable: false });
    expect(container.firstChild).toBeNull();
  });

  it("renders the inspector placeholder when there is no product and editable", () => {
    renderBlock({ editable: true });
    expect(screen.getByText(/open this on a product page/i)).toBeInTheDocument();
  });
});

describe("ProductBlock — product rendering", () => {
  it("renders title, formatted price, description, and image with alt fallback", () => {
    productMap = {
      p1: product({
        description: "Soft cotton",
        images: [{ url: "/x.png", alt: "" }],
        variants: [variant({ priceAmount: 2500, currency: "usd" })],
      }),
    };
    const { container } = renderBlock({ block: { props: { productId: "p1" } } as never });

    expect(screen.getByText("Classic Tee")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    expect(screen.getByText("Soft cotton")).toBeInTheDocument();
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("Classic Tee");
  });

  it("falls back to the first product when productId is empty", () => {
    productMap = { p1: product({ title: "First Product" }) };
    renderBlock({ block: { props: {} } as never });
    expect(screen.getByText("First Product")).toBeInTheDocument();
  });

  it("renders option selects and updates the selection / matched variant on change", () => {
    productMap = {
      p1: product({
        variants: [
          variant({ id: "s", options: { Size: "S" }, priceAmount: 1000 }),
          variant({ id: "m", options: { Size: "M" }, priceAmount: 3000 }),
        ],
      }),
    };
    const { container } = renderBlock({ block: { props: { productId: "p1" } } as never });

    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(screen.getByText("Select Size")).toBeInTheDocument();
    // Defaults to the first variant's price.
    expect(screen.getByText("$10.00")).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "M" } });
    expect(select.value).toBe("M");
    expect(screen.getByText("$30.00")).toBeInTheDocument();
  });
});

describe("ProductBlock — add to cart", () => {
  it("adds the matched variant on click when in stock and not editable", () => {
    productMap = { p1: product({ variants: [variant({ id: "v9" })] }) };
    renderBlock({ block: { props: { productId: "p1" } } as never, editable: false });

    const button = screen.getByRole("button", { name: "Add to cart" });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(addItem).toHaveBeenCalledWith("v9");
  });

  it("shows Out of stock and disables the button when inventory is zero and policy denies", () => {
    productMap = {
      p1: product({ variants: [variant({ inventory: 0, inventoryPolicy: "deny" })] }),
    };
    renderBlock({ block: { props: { productId: "p1" } } as never, editable: false });

    const button = screen.getByRole("button", { name: "Out of stock" });
    expect(button).toBeDisabled();
  });

  it("disables the add-to-cart button in editable mode even when in stock", () => {
    productMap = { p1: product({ variants: [variant({ inventory: 5 })] }) };
    renderBlock({ block: { props: { productId: "p1" } } as never, editable: true });

    const button = screen.getByRole("button", { name: "Add to cart" });
    expect(button).toBeDisabled();
  });
});
