import { prisma } from "@/lib/prisma";

type Session = {
  id: string;
  customer_details?: { email?: string | null } | null;
  customer?: string | null;
  payment_intent?: string | null;
  currency?: string | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
  total_details?: {
    amount_tax?: number | null;
    amount_discount?: number | null;
    amount_shipping?: number | null;
  } | null;
  shipping_details?: unknown;
  metadata?: { cartId?: string; siteId?: string } | null;
};

export async function settleCheckout(session: Session): Promise<{ created: boolean }> {
  const siteId = session.metadata?.siteId;
  const cartId = session.metadata?.cartId;
  if (!siteId || !cartId) return { created: false };

  const existing = await prisma.order.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  });
  if (existing) return { created: false };

  const cart = await prisma.cart.findFirst({
    where: { id: cartId, siteId },
    include: { items: true },
  });
  if (!cart) return { created: false };

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: cart.items.map((i) => i.variantId) } },
    include: { product: true },
  });
  const vmap = new Map(variants.map((v) => [v.id, v]));

  try {
    await prisma.$transaction(async (tx) => {
      const agg = await tx.order.aggregate({ where: { siteId }, _max: { number: true } });
      const number = (agg._max.number ?? 0) + 1;
      await tx.order.create({
        data: {
          siteId,
          number,
          email: session.customer_details?.email ?? "",
          status: "paid",
          currency: session.currency ?? "usd",
          subtotalAmount: session.amount_subtotal ?? 0,
          taxAmount: session.total_details?.amount_tax ?? 0,
          shippingAmount: session.total_details?.amount_shipping ?? 0,
          discountAmount: session.total_details?.amount_discount ?? 0,
          totalAmount: session.amount_total ?? 0,
          shippingAddress: JSON.stringify(session.shipping_details ?? {}),
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: session.payment_intent ?? null,
          stripeCustomerId: session.customer ?? null,
          items: {
            create: cart.items.map((i) => {
              const v = vmap.get(i.variantId);
              return {
                variantId: i.variantId,
                productTitle: v?.product.title ?? "",
                variantTitle: v?.title ?? "",
                sku: v?.sku ?? null,
                quantity: i.quantity,
                unitAmount: i.unitAmount,
              };
            }),
          },
        },
      });
      for (const i of cart.items) {
        const v = vmap.get(i.variantId);
        if (v && v.inventory >= 0) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: { inventory: Math.max(0, v.inventory - i.quantity) },
          });
        }
      }
      await tx.cart.update({ where: { id: cart.id }, data: { status: "converted" } });
    });
    return { created: true };
  } catch {
    return { created: false };
  }
}
