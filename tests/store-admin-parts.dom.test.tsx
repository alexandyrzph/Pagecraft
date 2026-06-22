import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StripePanel } from "@/components/store/StoreAdmin.parts";
import type { Store } from "@/components/store/StoreAdmin.helpers";

const store = (over: Partial<Store> = {}): Store =>
  ({ chargesEnabled: false, stripeAccountId: null, ...over }) as Store;

describe("StripePanel", () => {
  it("shows the connected state when charges are enabled", () => {
    render(
      <StripePanel
        store={store({ chargesEnabled: true })}
        connecting={false}
        onConnect={() => {}}
      />,
    );
    expect(screen.getByText("Connected — charges enabled")).toBeInTheDocument();
  });

  it("offers Connect when there is no account and fires onConnect", () => {
    const onConnect = vi.fn();
    render(<StripePanel store={store()} connecting={false} onConnect={onConnect} />);
    const btn = screen.getByRole("button", { name: "Connect Stripe" });
    fireEvent.click(btn);
    expect(onConnect).toHaveBeenCalled();
  });

  it("offers Finish onboarding when an account exists", () => {
    render(
      <StripePanel
        store={store({ stripeAccountId: "acct_1" })}
        connecting={true}
        onConnect={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Finish Stripe onboarding" })).toBeInTheDocument();
  });
});
