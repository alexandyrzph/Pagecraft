import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/commerce/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response("Missing signature", { status: 400 });
  const raw = await req.text();
  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object;
    await prisma.store.updateMany({
      where: { stripeAccountId: account.id },
      data: { chargesEnabled: account.charges_enabled, payoutsEnabled: account.payouts_enabled },
    });
  }

  if (event.type === "checkout.session.completed") {
    const { settleCheckout } = await import("@/lib/commerce/order");
    await settleCheckout(event.data.object as Parameters<typeof settleCheckout>[0]);
  }

  return new Response(null, { status: 200 });
}
