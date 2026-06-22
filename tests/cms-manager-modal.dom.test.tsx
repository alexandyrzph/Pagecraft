// Render tests for <CmsManagerModal/>: drives the extracted state hook and the
// thin action wrappers by rendering the exported component and interacting with
// it. Covers the name-sync, the missing-collection effect, tab switching, and
// every wired action (patch / add field / add+save+delete item / delete).
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { CollectionData } from "@/lib/types";

const { pushMock, confirmMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  confirmMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/components/ui/dialog-provider", () => ({ useConfirm: () => confirmMock }));

import { api } from "@/lib/api/client";
import { CollectionsProvider } from "@/components/editor/collections-context";
import { CmsManagerModal } from "@/components/editor/CmsManagerModal";

const post = api.post as unknown as Mock;
const put = api.put as unknown as Mock;
const del = api.delete as unknown as Mock;

const refresh = vi.fn(async () => {});

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

function renderModal(collection: CollectionData | null, onClose = vi.fn()) {
  const map = collection ? { [collection.id]: collection } : {};
  const ui = render(
    <CollectionsProvider value={{ list: Object.values(map), map, refresh }}>
      <CmsManagerModal collectionId="c1" onClose={onClose} />
    </CollectionsProvider>,
  );
  return { onClose, ...ui };
}

beforeEach(() => {
  pushMock.mockReset();
  confirmMock.mockReset().mockResolvedValue(true);
  post.mockReset().mockResolvedValue({ data: { id: "new", data: {} } });
  put.mockReset().mockResolvedValue({ data: {} });
  del.mockReset().mockResolvedValue({ data: {} });
  refresh.mockClear();
});

describe("CmsManagerModal", () => {
  it("syncs the collection name into the editable header field", () => {
    renderModal(makeCollection());
    expect(screen.getByDisplayValue("Posts")).toBeInTheDocument();
    expect(screen.getByText("/posts")).toBeInTheDocument();
  });

  it("calls onClose via the effect when the collection is missing", async () => {
    const { onClose } = renderModal(null);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("renames the collection on blur when the name changed", async () => {
    renderModal(makeCollection());
    const nameInput = screen.getByDisplayValue("Posts");
    fireEvent.change(nameInput, { target: { value: "Renamed" } });
    fireEvent.blur(nameInput);
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/collections/c1", { name: "Renamed" }),
    );
  });

  it("does not patch on blur when the name is unchanged", () => {
    renderModal(makeCollection());
    fireEvent.blur(screen.getByDisplayValue("Posts"));
    expect(put).not.toHaveBeenCalled();
  });

  it("adds a field through the Add button", async () => {
    renderModal(makeCollection());
    fireEvent.change(screen.getByPlaceholderText("e.g. Cover image"), {
      target: { value: "Author" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/collections/c1", {
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "author", label: "Author", type: "text" },
        ],
      }),
    );
  });

  it("removes a field through its remove button", async () => {
    renderModal(makeCollection());
    fireEvent.click(screen.getByRole("button", { name: "Remove field" }));
    await waitFor(() => expect(put).toHaveBeenCalledWith("/api/collections/c1", { fields: [] }));
  });

  it("switches to the items tab and adds an item", async () => {
    renderModal(makeCollection());
    fireEvent.click(screen.getByRole("button", { name: /items/i }));
    expect(screen.getByText("Hello")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/collections/c1/items", { data: { title: "" } }),
    );
  });

  it("edits and saves an item from the items tab", async () => {
    renderModal(makeCollection());
    fireEvent.click(screen.getByRole("button", { name: /items/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/collections/c1/items/i1", {
        data: { title: "Hello" },
      }),
    );
  });

  it("deletes an item from the items tab", async () => {
    renderModal(makeCollection());
    fireEvent.click(screen.getByRole("button", { name: /items/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete item" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/api/collections/c1/items/i1"));
  });

  it("toggles detail pages on from the detail tab", async () => {
    renderModal(makeCollection());
    fireEvent.click(screen.getByRole("button", { name: /detail page/i }));
    expect(screen.getByText("Detail pages")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/collections/c1", { detailEnabled: true }),
    );
  });

  it("navigates to the detail template editor when detail pages are enabled", () => {
    renderModal(makeCollection({ detailEnabled: true }));
    fireEvent.click(screen.getByRole("button", { name: /detail page/i }));
    fireEvent.click(screen.getByRole("button", { name: /edit detail template/i }));
    expect(pushMock).toHaveBeenCalledWith("/collection/c1/template");
  });

  it("deletes the collection after the confirm dialog is accepted", async () => {
    const { onClose } = renderModal(makeCollection());
    fireEvent.click(screen.getByRole("button", { name: "Delete collection" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/api/collections/c1"));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
