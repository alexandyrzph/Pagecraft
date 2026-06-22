import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

const state = vi.hoisted(() => ({
  siteId: "",
  roleCalls: [] as string[],
  syncShouldThrow: false,
}));

vi.mock("@/lib/api/api-handler", () => ({
  withSite: (fn: (c: { site: { id: string } }) => unknown) => fn({ site: { id: state.siteId } }),
  withSiteRole: (min: string, fn: (c: { site: { id: string } }) => unknown) => {
    state.roleCalls.push(min);
    return fn({ site: { id: state.siteId } });
  },
}));

vi.mock("@/lib/commerce/sync", () => ({
  syncProductToStripe: vi.fn(async () => {
    if (state.syncShouldThrow) throw new Error("stripe unavailable");
  }),
}));

const prisma = new PrismaClient();
const wsIds: string[] = [];

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: wsIds } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  state.roleCalls = [];
  state.syncShouldThrow = false;
});

const rand = () => Math.random().toString(36).slice(2, 8);

async function makeProduct() {
  const ws = await prisma.workspace.create({
    data: { name: "T", slug: `pid-${Date.now()}-${rand()}` },
  });
  wsIds.push(ws.id);
  const site = await prisma.site.create({
    data: { workspaceId: ws.id, name: "S", handle: `s-${rand()}` },
  });
  state.siteId = site.id;
  const product = await prisma.product.create({
    data: {
      siteId: site.id,
      handle: `tee-${rand()}`,
      title: "Tee",
      description: "old",
      status: "draft",
      data: '{"vendor":"Old"}',
      variants: { create: [{ siteId: site.id, title: "Default", priceAmount: 1000 }] },
      images: { create: [{ url: "/old.png", alt: "old", position: 0 }] },
    },
    include: { variants: true, images: true },
  });
  return { site, product };
}

const call = (id: string, body?: unknown) =>
  import("@/app/api/products/[id]/route").then(({ PATCH }) =>
    PATCH(
      new Request("http://x/api/products/x", {
        method: "PATCH",
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      { params: Promise.resolve({ id }) },
    ),
  );

describe("PATCH /api/products/[id]", () => {
  it("updates scalar fields, variant data, and replaces images", async () => {
    const { product } = await makeProduct();
    const variantId = product.variants[0].id;

    const res = await call(product.id, {
      title: "Updated Tee",
      description: "new desc",
      status: "active",
      data: '{"vendor":"New"}',
      variants: [
        {
          id: variantId,
          title: "Large",
          options: '{"Size":"L"}',
          sku: "SKU-L",
          priceAmount: 2500,
          inventory: 7,
          inventoryPolicy: "continue",
        },
        { id: 123 }, // non-string id -> continue branch
        { title: "no id at all" }, // missing id -> continue branch
      ],
      images: [
        { url: "/new-a.png", alt: "a" },
        { alt: "no url, filtered out" },
        { url: "/new-b.png" },
      ],
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.product.title).toBe("Updated Tee");
    expect(json.product.description).toBe("new desc");
    expect(json.product.status).toBe("active");
    expect(state.roleCalls).toContain("EDITOR");

    const variant = json.product.variants.find((v: { id: string }) => v.id === variantId);
    expect(variant.priceAmount).toBe(2500);
    expect(variant.inventory).toBe(7);
    expect(variant.stripePriceId).toBeNull();

    expect(json.product.images.map((i: { url: string }) => i.url)).toEqual([
      "/new-a.png",
      "/new-b.png",
    ]);
    expect(json.product.images[0].position).toBe(0);
    expect(json.product.images[1].position).toBe(1);
  });

  it("returns 404 when the product is not in the active site", async () => {
    await makeProduct();
    const res = await call("does-not-exist", { title: "x" });
    expect(res.status).toBe(404);
  });

  it("is a no-op for an empty / unparseable body but still returns the product", async () => {
    const { product } = await makeProduct();

    // No body at all -> req.json() rejects -> .catch(() => ({})).
    const res = await call(product.id);
    expect(res.status).toBe(200);
    const json = await res.json();
    // pickProductData returned {} so nothing changed; variants/images untouched.
    expect(json.product.title).toBe("Tee");
    expect(json.product.variants[0].priceAmount).toBe(1000);
    expect(json.product.images.map((i: { url: string }) => i.url)).toEqual(["/old.png"]);
  });

  it("ignores non-array variants/images and unknown-typed fields", async () => {
    const { product } = await makeProduct();

    const res = await call(product.id, {
      title: 42, // wrong type -> skipped, leaves data empty
      variants: "not-an-array",
      images: { not: "an array" },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.product.title).toBe("Tee");
    expect(json.product.images.map((i: { url: string }) => i.url)).toEqual(["/old.png"]);
  });

  it("swallows a Stripe sync failure and still returns 200", async () => {
    const { product } = await makeProduct();
    state.syncShouldThrow = true;

    const res = await call(product.id, { title: "Synced Tee" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.product.title).toBe("Synced Tee");
  });
});
