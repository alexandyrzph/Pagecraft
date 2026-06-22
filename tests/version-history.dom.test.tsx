// Render tests for <VersionHistory/>: drives the internal handlers exposed by
// the custom `useVersionHistoryState` hook (snapshot / restore / remove, plus
// the no-pageId early returns) through the rendered component, and exercises
// the loading / empty / populated body branches and the extracted subcomponents.
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { api } from "@/lib/api/client";
import { useEditor } from "@/store/editor-store";
import { VersionHistory } from "@/components/editor/VersionHistory";
import {
  VersionHistoryBody,
  VersionHistoryHeader,
  VersionRow,
  type Version,
} from "@/components/editor/VersionHistory.helpers";

const get = api.get as unknown as Mock;
const post = api.post as unknown as Mock;
const del = api.delete as unknown as Mock;

function version(id: string, label = "Manual save"): Version {
  return { id, label, createdAt: new Date().toISOString() };
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  del.mockReset();
  get.mockResolvedValue({ data: [] });
  post.mockResolvedValue({ data: {} });
  del.mockResolvedValue({ data: {} });
  useEditor.getState().init({ id: "p1", title: "T", slug: "t", published: false, tree: [] });
});

describe("VersionHistory — open/close + body branches", () => {
  it("renders nothing while closed", () => {
    const { container } = render(
      <VersionHistory open={false} onClose={() => {}} pageId="p1" save={async () => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the empty state once the (empty) fetch settles", async () => {
    render(<VersionHistory open onClose={() => {}} pageId="p1" save={async () => {}} />);
    expect(await screen.findByText(/No versions yet/)).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/api/pages/p1/versions");
  });

  it("lists fetched versions", async () => {
    get.mockResolvedValue({ data: [version("v1", "Published"), version("v2")] });
    render(<VersionHistory open onClose={() => {}} pageId="p1" save={async () => {}} />);
    expect(await screen.findByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Manual save")).toBeInTheDocument();
  });

  it("does not fetch when there is no pageId", () => {
    render(<VersionHistory open onClose={() => {}} pageId={null} save={async () => {}} />);
    expect(get).not.toHaveBeenCalled();
  });
});

describe("VersionHistory — snapshot()", () => {
  it("saves, posts a Manual save version, then refreshes", async () => {
    const save = vi.fn(async () => {});
    get.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [version("v1")] });
    render(<VersionHistory open onClose={() => {}} pageId="p1" save={save} />);
    await screen.findByText(/No versions yet/);

    fireEvent.click(screen.getByRole("button", { name: /Save version/ }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/pages/p1/versions", {
        label: "Manual save",
      }),
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Manual save")).toBeInTheDocument();
  });
});

describe("VersionHistory — restore()", () => {
  it("snapshots, loads the version, replaces tree + theme, saves, and closes", async () => {
    const onClose = vi.fn();
    const save = vi.fn(async () => {});
    get
      .mockResolvedValueOnce({ data: [version("v1")] }) // initial list
      .mockResolvedValueOnce({
        data: {
          content: [{ id: "blk", type: "heading", props: {}, styles: {}, children: [] }],
          theme: { brand: "#abc" },
        },
      }); // version fetch
    render(<VersionHistory open onClose={onClose} pageId="p1" save={save} />);
    await screen.findByText("Manual save");

    fireEvent.click(screen.getByRole("button", { name: /Restore/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith("/api/pages/p1/versions", { label: "Before restore" });
    expect(get).toHaveBeenCalledWith("/api/pages/p1/versions/v1");
    expect(useEditor.getState().tree[0].id).toBe("blk");
    expect(useEditor.getState().theme.brand).toBe("#abc");
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("defaults to an empty theme when the snapshot omits one", async () => {
    get
      .mockResolvedValueOnce({ data: [version("v1")] })
      .mockResolvedValueOnce({ data: { content: [], theme: undefined } });
    render(<VersionHistory open onClose={() => {}} pageId="p1" save={async () => {}} />);
    await screen.findByText("Manual save");

    fireEvent.click(screen.getByRole("button", { name: /Restore/ }));
    await waitFor(() => expect(useEditor.getState().tree).toHaveLength(0));
  });
});

describe("VersionHistory — remove()", () => {
  it("deletes the version then refreshes the list", async () => {
    get.mockResolvedValueOnce({ data: [version("v1")] }).mockResolvedValueOnce({ data: [] });
    render(<VersionHistory open onClose={() => {}} pageId="p1" save={async () => {}} />);
    await screen.findByText("Manual save");

    fireEvent.click(screen.getByRole("button", { name: "Delete version" }));

    await waitFor(() => expect(del).toHaveBeenCalledWith("/api/pages/p1/versions/v1"));
    await waitFor(() => expect(screen.queryByText("Manual save")).toBeNull());
  });
});

describe("VersionHistory subcomponents", () => {
  it("VersionHistoryHeader shows a spinner while the save is busy and fires callbacks", () => {
    const onSnapshot = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <VersionHistoryHeader busy={null} onSnapshot={onSnapshot} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Save version/ }));
    expect(onSnapshot).toHaveBeenCalledTimes(1);

    rerender(<VersionHistoryHeader busy="save" onSnapshot={onSnapshot} onClose={onClose} />);
    expect(screen.getByRole("button", { name: /Save version/ })).toBeDisabled();
  });

  it("VersionRow disables actions while any work is busy and routes its callbacks", () => {
    const onRestore = vi.fn();
    const onRemove = vi.fn();
    const v = version("vx");
    const { rerender } = render(
      <VersionRow version={v} busy={null} onRestore={onRestore} onRemove={onRemove} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Restore/ }));
    fireEvent.click(screen.getByRole("button", { name: "Delete version" }));
    expect(onRestore).toHaveBeenCalledWith(v);
    expect(onRemove).toHaveBeenCalledWith("vx");

    rerender(<VersionRow version={v} busy="vx" onRestore={onRestore} onRemove={onRemove} />);
    expect(screen.getByRole("button", { name: /Restore/ })).toBeDisabled();
  });

  it("VersionHistoryBody renders the loading skeleton", () => {
    const { container } = render(
      <VersionHistoryBody
        loading
        versions={[]}
        busy={null}
        onRestore={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(container.querySelectorAll(".pc-skeleton")).toHaveLength(4);
  });
});
