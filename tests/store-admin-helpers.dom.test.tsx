import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { api } from "@/lib/api/client";
import { connectStripe, deleteProductById } from "@/components/store/StoreAdmin.helpers";

const post = api.post as unknown as Mock;
const del = api.delete as unknown as Mock;

function axiosError(message: string) {
  return Object.assign(new Error("request failed"), {
    isAxiosError: true,
    response: { data: { error: message } },
  });
}

const originalLocation = window.location;

beforeEach(() => {
  post.mockReset();
  del.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: "" },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
});

describe("connectStripe", () => {
  it("posts to the connect endpoint and redirects to the returned url on success", async () => {
    post.mockResolvedValueOnce({ data: { url: "https://connect.stripe.test/onboard" } });
    const setConnecting = vi.fn();
    const alert = vi.fn().mockResolvedValue(undefined);

    await connectStripe(setConnecting, alert);

    expect(setConnecting).toHaveBeenCalledWith(true);
    expect(post).toHaveBeenCalledWith("/api/store/connect", {});
    expect(window.location.href).toBe("https://connect.stripe.test/onboard");
    expect(alert).not.toHaveBeenCalled();
  });

  it("surfaces the server error message and clears connecting on an axios failure", async () => {
    post.mockRejectedValueOnce(axiosError("Account not eligible"));
    const setConnecting = vi.fn();
    const alert = vi.fn().mockResolvedValue(undefined);

    await connectStripe(setConnecting, alert);

    expect(setConnecting).toHaveBeenNthCalledWith(1, true);
    expect(alert).toHaveBeenCalledWith({
      title: "Couldn't connect Stripe",
      message: "Account not eligible",
    });
    expect(setConnecting).toHaveBeenLastCalledWith(false);
  });

  it("falls back to a generic message when the error is not an axios error", async () => {
    post.mockRejectedValueOnce(new Error("boom"));
    const setConnecting = vi.fn();
    const alert = vi.fn().mockResolvedValue(undefined);

    await connectStripe(setConnecting, alert);

    expect(alert).toHaveBeenCalledWith({
      title: "Couldn't connect Stripe",
      message: "Please try again.",
    });
    expect(setConnecting).toHaveBeenLastCalledWith(false);
  });
});

describe("deleteProductById", () => {
  it("does nothing when the confirm dialog is declined", async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    const alert = vi.fn().mockResolvedValue(undefined);
    const setEditing = vi.fn();
    const reload = vi.fn().mockResolvedValue(undefined);

    await deleteProductById("p1", confirm, alert, setEditing, reload);

    expect(confirm).toHaveBeenCalledWith({
      title: "Delete product?",
      message: "This product and all of its variants will be permanently removed.",
      confirmLabel: "Delete",
      destructive: true,
    });
    expect(del).not.toHaveBeenCalled();
    expect(setEditing).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("deletes, closes the editor, and reloads when confirmed", async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const alert = vi.fn().mockResolvedValue(undefined);
    const setEditing = vi.fn();
    const reload = vi.fn().mockResolvedValue(undefined);
    del.mockResolvedValueOnce({ data: {} });

    await deleteProductById("p9", confirm, alert, setEditing, reload);

    expect(del).toHaveBeenCalledWith("/api/products/p9");
    expect(setEditing).toHaveBeenCalledWith(null);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
  });

  it("surfaces the server error message when the delete fails with an axios error", async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const alert = vi.fn().mockResolvedValue(undefined);
    const setEditing = vi.fn();
    const reload = vi.fn().mockResolvedValue(undefined);
    del.mockRejectedValueOnce(axiosError("Product is referenced by an order"));

    await deleteProductById("p2", confirm, alert, setEditing, reload);

    expect(alert).toHaveBeenCalledWith({
      title: "Couldn't delete product",
      message: "Product is referenced by an order",
    });
    expect(setEditing).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the delete fails with a non-axios error", async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const alert = vi.fn().mockResolvedValue(undefined);
    const setEditing = vi.fn();
    const reload = vi.fn().mockResolvedValue(undefined);
    del.mockRejectedValueOnce(new Error("network down"));

    await deleteProductById("p3", confirm, alert, setEditing, reload);

    expect(alert).toHaveBeenCalledWith({
      title: "Couldn't delete product",
      message: "Please try again.",
    });
  });
});
