import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccess({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const order = session_id
    ? await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session_id } })
    : null;
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Thank you!</h1>
      {order ? (
        <p className="mt-3 text-slate-600">Your order #{order.number} is confirmed.</p>
      ) : (
        <p className="mt-3 text-slate-600">
          Your payment is processing — your confirmation will appear shortly.
        </p>
      )}
    </main>
  );
}
