export const dynamic = "force-dynamic";

export default function CheckoutCancel() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Checkout cancelled</h1>
      <p className="mt-3 text-slate-600">
        Your cart is still saved — you can finish whenever you&apos;re ready.
      </p>
    </main>
  );
}
