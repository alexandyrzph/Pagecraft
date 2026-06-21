import { describe, it, expect, vi, beforeEach } from "vitest";

const constructEvent = vi.fn();
const settle = vi.fn(async () => ({ created: true }));
vi.mock("@/lib/commerce/stripe", () => ({ getStripe: () => ({ webhooks: { constructEvent } }) }));
vi.mock("@/lib/commerce/order", () => ({ settleCheckout: settle }));

import { POST } from "@/app/api/webhooks/stripe/route";

beforeEach(() => {
  constructEvent.mockReset();
  settle.mockClear();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

function req(body: string, sig: string | null) {
  return new Request("http://x/api/webhooks/stripe", {
    method: "POST",
    headers: sig ? { "stripe-signature": sig } : {},
    body,
  });
}

describe("POST /api/webhooks/stripe", () => {
  it("400s without a signature", async () => {
    expect((await POST(req("{}", null))).status).toBe(400);
  });
  it("400s on an invalid signature", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("bad");
    });
    expect((await POST(req("{}", "sig"))).status).toBe(400);
  });
  it("settles a checkout.session.completed event", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", metadata: {} } },
    });
    const res = await POST(req("{}", "sig"));
    expect(res.status).toBe(200);
    expect(settle).toHaveBeenCalledOnce();
  });
});
