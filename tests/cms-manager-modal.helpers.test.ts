// Unit tests for the pure/async helpers extracted out of <CmsManagerModal/>.
// They hit every branch: the busy-flag toggling, the early returns, the
// nullish-data fallback, and the conditional setEditing reset.
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { api } from "@/lib/api/client";
import {
  buildAddedFields,
  closeIfMissing,
  runAddItem,
  runDeleteCollection,
  runDeleteItem,
  runPatchCollection,
  runSaveItem,
} from "@/components/editor/CmsManagerModal.helpers";
import type { CollectionField } from "@/lib/types";

const post = api.post as unknown as Mock;
const put = api.put as unknown as Mock;
const del = api.delete as unknown as Mock;

const refresh = vi.fn(async () => {});

beforeEach(() => {
  post.mockReset().mockResolvedValue({ data: {} });
  put.mockReset().mockResolvedValue({ data: {} });
  del.mockReset().mockResolvedValue({ data: {} });
  refresh.mockClear();
});

const textField: CollectionField = { key: "title", label: "Title", type: "text" };

describe("closeIfMissing", () => {
  it("calls onClose when the collection is absent", () => {
    const onClose = vi.fn();
    closeIfMissing(undefined, onClose);
    closeIfMissing(null, onClose);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does nothing when the collection is present", () => {
    const onClose = vi.fn();
    closeIfMissing({ id: "c1" }, onClose);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("buildAddedFields", () => {
  it("appends a field built from the trimmed label", () => {
    const next = buildAddedFields([textField], "  Cover image  ", "image");
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ key: "cover-image", label: "Cover image", type: "image" });
    expect(next[0]).toBe(textField);
  });

  it("falls back to 'New field' when the label is blank", () => {
    const next = buildAddedFields([], "   ", "text");
    expect(next[0]).toEqual({ key: "new-field", label: "New field", type: "text" });
  });

  it("disambiguates the generated key against existing keys", () => {
    const next = buildAddedFields(
      [{ key: "title", label: "Title", type: "text" }],
      "Title",
      "text",
    );
    expect(next[1].key).toBe("title-2");
  });
});

describe("runPatchCollection", () => {
  it("toggles busy around a PUT then refresh", async () => {
    const setBusy = vi.fn();
    await runPatchCollection("c1", { name: "X" }, setBusy, refresh);
    expect(put).toHaveBeenCalledWith("/api/collections/c1", { name: "X" });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(setBusy.mock.calls).toEqual([[true], [false]]);
  });

  it("still clears busy when the request rejects", async () => {
    const setBusy = vi.fn();
    put.mockRejectedValueOnce(new Error("boom"));
    await expect(runPatchCollection("c1", {}, setBusy, refresh)).rejects.toThrow("boom");
    expect(setBusy.mock.calls).toEqual([[true], [false]]);
  });
});

describe("runAddItem", () => {
  it("posts a blank item, refreshes, switches to the items tab and selects it", async () => {
    post.mockResolvedValueOnce({ data: { id: "i9", data: { title: "seed" } } });
    const setBusy = vi.fn();
    const setEditing = vi.fn();
    const setTab = vi.fn();
    await runAddItem("c1", [textField], setBusy, setEditing, setTab, refresh);
    expect(post).toHaveBeenCalledWith("/api/collections/c1/items", { data: { title: "" } });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(setTab).toHaveBeenCalledWith("items");
    expect(setEditing).toHaveBeenCalledWith({ id: "i9", data: { title: "seed" } });
    expect(setBusy.mock.calls).toEqual([[true], [false]]);
  });

  it("defaults the new item's data to {} when the response omits it", async () => {
    post.mockResolvedValueOnce({ data: { id: "i10" } });
    const setEditing = vi.fn();
    await runAddItem("c1", [], vi.fn(), setEditing, vi.fn(), refresh);
    expect(setEditing).toHaveBeenCalledWith({ id: "i10", data: {} });
  });
});

describe("runSaveItem", () => {
  it("returns early and touches nothing when there is no editing draft", async () => {
    const setBusy = vi.fn();
    await runSaveItem("c1", null, setBusy, vi.fn(), refresh);
    expect(put).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(setBusy).not.toHaveBeenCalled();
  });

  it("PUTs the edited data, refreshes and clears the draft", async () => {
    const setBusy = vi.fn();
    const setEditing = vi.fn();
    await runSaveItem("c1", { id: "i1", data: { title: "Hi" } }, setBusy, setEditing, refresh);
    expect(put).toHaveBeenCalledWith("/api/collections/c1/items/i1", { data: { title: "Hi" } });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(setEditing).toHaveBeenCalledWith(null);
    expect(setBusy.mock.calls).toEqual([[true], [false]]);
  });
});

describe("runDeleteItem", () => {
  it("deletes, refreshes and clears the draft when the deleted item was open", async () => {
    const setEditing = vi.fn();
    const setBusy = vi.fn();
    await runDeleteItem("c1", "i1", { id: "i1", data: {} }, setBusy, setEditing, refresh);
    expect(del).toHaveBeenCalledWith("/api/collections/c1/items/i1");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(setEditing).toHaveBeenCalledWith(null);
    expect(setBusy.mock.calls).toEqual([[true], [false]]);
  });

  it("keeps the draft when a different item is deleted", async () => {
    const setEditing = vi.fn();
    await runDeleteItem("c1", "i2", { id: "i1", data: {} }, vi.fn(), setEditing, refresh);
    expect(del).toHaveBeenCalledWith("/api/collections/c1/items/i2");
    expect(setEditing).not.toHaveBeenCalled();
  });

  it("handles a null draft without clearing", async () => {
    const setEditing = vi.fn();
    await runDeleteItem("c1", "i2", null, vi.fn(), setEditing, refresh);
    expect(setEditing).not.toHaveBeenCalled();
  });
});

describe("runDeleteCollection", () => {
  it("aborts when the confirm dialog is declined", async () => {
    const confirm = vi.fn(async () => false);
    const setBusy = vi.fn();
    const onClose = vi.fn();
    await runDeleteCollection("c1", "Posts", confirm, setBusy, refresh, onClose);
    expect(confirm).toHaveBeenCalledWith({
      title: "Delete collection?",
      message: `"Posts" and all of its items will be permanently deleted.`,
      confirmLabel: "Delete collection",
      destructive: true,
    });
    expect(del).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(setBusy).not.toHaveBeenCalled();
  });

  it("deletes, refreshes and closes once confirmed", async () => {
    const confirm = vi.fn(async () => true);
    const setBusy = vi.fn();
    const onClose = vi.fn();
    await runDeleteCollection("c1", "Posts", confirm, setBusy, refresh, onClose);
    expect(setBusy).toHaveBeenCalledWith(true);
    expect(del).toHaveBeenCalledWith("/api/collections/c1");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
