import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import type { ReactNode } from "react";
import { render, screen, renderHook, act, fireEvent } from "@testing-library/react";
import type { CollectionData, CollectionItem } from "@/lib/types";

const { alertMock, pushMock, refreshMock } = vi.hoisted(() => ({
  alertMock: vi.fn(() => Promise.resolve()),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/components/ui/dialog-provider", () => ({
  useConfirm: () => () => Promise.resolve(true),
  useAlert: () => alertMock,
  DialogProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock, replace: vi.fn() }),
}));

import { api } from "@/lib/api/client";
import { useCollectionManager } from "@/components/app-shell/cms/CollectionManager.helpers";
import { ItemsTab } from "@/components/app-shell/cms/CollectionManager.parts";

const del = api.delete as unknown as Mock;

function makeCollection(over: Partial<CollectionData> = {}): CollectionData {
  return {
    id: "c1",
    name: "Posts",
    slug: "posts",
    fields: [{ key: "title", label: "Title", type: "text" }],
    items: [{ id: "i1", data: { title: "Hello" }, order: 0 }],
    ...over,
  };
}

beforeEach(() => {
  alertMock.mockReset();
  pushMock.mockReset();
  refreshMock.mockReset();
  del.mockReset();
});

describe("useCollectionManager.deleteCollection", () => {
  it("deletes then navigates to /cms and refreshes on success", async () => {
    del.mockResolvedValueOnce({ data: {} });
    const { result } = renderHook(() => useCollectionManager(makeCollection()));

    await act(async () => {
      await result.current.deleteCollection();
    });

    expect(del).toHaveBeenCalledWith("/api/collections/c1");
    expect(pushMock).toHaveBeenCalledWith("/cms");
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(alertMock).not.toHaveBeenCalled();
  });

  it("alerts the server error message from an axios error response", async () => {
    const axiosErr = Object.assign(new Error("req failed"), {
      isAxiosError: true,
      response: { data: { error: "in use" } },
    });
    del.mockRejectedValueOnce(axiosErr);
    const { result } = renderHook(() => useCollectionManager(makeCollection()));

    await act(async () => {
      await result.current.deleteCollection();
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith({
      title: "Couldn't delete collection",
      message: "in use",
    });
  });

  it("falls back to a generic message for a non-axios error", async () => {
    del.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useCollectionManager(makeCollection()));

    await act(async () => {
      await result.current.deleteCollection();
    });

    expect(alertMock).toHaveBeenCalledWith({
      title: "Couldn't delete collection",
      message: "Please try again.",
    });
  });
});

describe("ItemsTab", () => {
  it("renders cells, the em-dash for empty/missing values, and wires row actions", () => {
    const setEditing = vi.fn();
    const deleteItem = vi.fn();
    const addItem = vi.fn();
    const col = makeCollection({
      fields: [
        { key: "title", label: "Title", type: "text" },
        { key: "blank", label: "Blank", type: "text" },
        { key: "missing", label: "Missing", type: "text" },
        { key: "tail", label: "Tail", type: "text" },
        { key: "dropped", label: "Dropped", type: "text" },
      ],
      items: [{ id: "i1", data: { title: "Hello", blank: "", tail: "World" }, order: 0 }],
    });

    render(
      <ItemsTab
        col={col}
        busy={false}
        addItem={addItem}
        setEditing={setEditing}
        deleteItem={deleteItem}
      />,
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("World")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Dropped")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(setEditing).toHaveBeenCalledWith(col.items[0]);

    fireEvent.click(screen.getByRole("button", { name: "Delete item" }));
    expect(deleteItem).toHaveBeenCalledWith("i1");

    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    expect(addItem).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state when the collection has no items", () => {
    const empty: CollectionData = makeCollection({ items: [] as CollectionItem[] });
    render(
      <ItemsTab
        col={empty}
        busy={true}
        addItem={vi.fn()}
        setEditing={vi.fn()}
        deleteItem={vi.fn()}
      />,
    );
    expect(screen.getByText("No items yet.")).toBeInTheDocument();
  });
});
