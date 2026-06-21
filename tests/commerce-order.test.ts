import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { settleCheckout } from "@/lib/commerce/order";

const prisma = new PrismaClient();
const wsIds: string[] = [];
afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: wsIds } } });
  await prisma.$disconnect();
});

function sessionPayload(cartId: string, siteId: string, sessionId: string) {
  return {
    id: sessionId,
    customer_details: { email: "buyer@example.com" },
    customer: "cus_1",
    payment_intent: "pi_1",
    currency: "usd",
    amount_subtotal: 3000,
    amount_total: 3300,
    total_details: { amount_tax: 300, amount_discount: 0, amount_shipping: 0 },
    shipping_details: { address: { city: "Sofia" } },
    metadata: { cartId, siteId },
  };
}

describe("settleCheckout", () => {
  it("creates exactly one order on replay (idempotent) and converts the cart", async () => {
    const ws = await prisma.workspace.create({ data: { name: "T", slug: `t-${Date.now()}` } });
    wsIds.push(ws.id);
    const site = await prisma.site.create({ data: { workspaceId: ws.id, name: "S", handle: "s" } });
    const product = await prisma.product.create({
      data: { siteId: site.id, handle: "tee", title: "Tee" },
    });
    const variant = await prisma.productVariant.create({
      data: {
        siteId: site.id,
        productId: product.id,
        title: "Default",
        priceAmount: 1500,
        inventory: 10,
      },
    });
    const cart = await prisma.cart.create({ data: { siteId: site.id } });
    await prisma.cartItem.create({
      data: { cartId: cart.id, variantId: variant.id, quantity: 2, unitAmount: 1500 },
    });

    const payload = sessionPayload(cart.id, site.id, `cs_${Date.now()}`);
    const r1 = await settleCheckout(payload);
    const r2 = await settleCheckout(payload);
    expect(r1.created).toBe(true);
    expect(r2.created).toBe(false);
    const orders = await prisma.order.findMany({ where: { siteId: site.id } });
    expect(orders.length).toBe(1);
    expect(orders[0].totalAmount).toBe(3300);
    expect(orders[0].taxAmount).toBe(300);
    const reread = await prisma.cart.findUnique({ where: { id: cart.id } });
    expect(reread?.status).toBe("converted");
  });

  it("creates exactly one order under concurrent settlement of the same session", async () => {
    const ws = await prisma.workspace.create({ data: { name: "T2", slug: `t2-${Date.now()}` } });
    wsIds.push(ws.id);
    const site = await prisma.site.create({
      data: { workspaceId: ws.id, name: "S2", handle: "s2" },
    });
    const product = await prisma.product.create({
      data: { siteId: site.id, handle: "hat", title: "Hat" },
    });
    const variant = await prisma.productVariant.create({
      data: {
        siteId: site.id,
        productId: product.id,
        title: "Default",
        priceAmount: 2000,
        inventory: 5,
      },
    });
    const cart = await prisma.cart.create({ data: { siteId: site.id } });
    await prisma.cartItem.create({
      data: { cartId: cart.id, variantId: variant.id, quantity: 1, unitAmount: 2000 },
    });

    const payload = sessionPayload(cart.id, site.id, `cs_conc_${Date.now()}`);
    const [a, b] = await Promise.all([settleCheckout(payload), settleCheckout(payload)]);
    expect([a.created, b.created].filter(Boolean).length).toBe(1);
    const orders = await prisma.order.findMany({ where: { stripeCheckoutSessionId: payload.id } });
    expect(orders.length).toBe(1);
  });
});
