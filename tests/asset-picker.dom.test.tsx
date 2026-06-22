// Render tests for <AssetPicker/>: exercises the open/kind→reload sync, the
// loading→grid/empty branches, asset selection (onSelect+onClose), the upload
// flow (select first + close, and the error→stay-open path), and the
// presentational subcomponents exported from AssetPicker.helpers.
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/upload", async () => {
  const actual = await vi.importActual<typeof import("@/lib/upload")>("@/lib/upload");
  return { ...actual, uploadFile: vi.fn() };
});

import { api } from "@/lib/api/client";
import { uploadFile, type UploadedAsset } from "@/lib/upload";
import { DialogProvider } from "@/components/ui/dialog-provider";
import { AssetPicker } from "@/components/editor/AssetPicker";
import {
  AssetEmptyState,
  AssetGrid,
  AssetSkeletonGrid,
} from "@/components/editor/AssetPicker.helpers";

const get = api.get as unknown as Mock;
const upload = uploadFile as unknown as Mock;

function asset(id: string, over: Partial<UploadedAsset> = {}): UploadedAsset {
  return { id, url: `/u/${id}`, name: id, type: "image/png", size: 1234, ...over };
}

function renderPicker(props: Partial<Parameters<typeof AssetPicker>[0]> = {}) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <DialogProvider>
      <AssetPicker open kind="image" onSelect={onSelect} onClose={onClose} {...props} />
    </DialogProvider>,
  );
  return { onSelect, onClose, ...utils };
}

beforeEach(() => {
  get.mockReset();
  upload.mockReset();
});

describe("AssetPicker", () => {
  it("requests the image-scoped library on open and renders the returned assets", async () => {
    get.mockResolvedValue({ data: [asset("a"), asset("b")] });
    renderPicker();

    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/assets?kind=image"));
    expect(await screen.findByRole("img", { name: "a" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "b" })).toBeInTheDocument();
  });

  it("requests the unscoped library for kind=all", async () => {
    get.mockResolvedValue({ data: [] });
    renderPicker({ kind: "all" });
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/assets"));
  });

  it("shows the empty state when there are no assets", async () => {
    get.mockResolvedValue({ data: [] });
    renderPicker();
    expect(await screen.findByText("No uploads yet")).toBeInTheDocument();
  });

  it("selects an asset and closes when its tile is clicked", async () => {
    get.mockResolvedValue({ data: [asset("a")] });
    const { onSelect, onClose } = renderPicker();

    fireEvent.click(await screen.findByRole("img", { name: "a" }));
    expect(onSelect).toHaveBeenCalledWith("/u/a");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed and does not fetch", () => {
    get.mockResolvedValue({ data: [] });
    renderPicker({ open: false });
    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByText("Media library")).toBeNull();
  });

  it("uploads a picked file, then selects+closes on the first result", async () => {
    get.mockResolvedValue({ data: [] });
    upload.mockResolvedValue(asset("up", { url: "/u/up" }));
    const { onSelect, onClose } = renderPicker();
    await screen.findByText("No uploads yet");

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "x.png")] } });

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("/u/up"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("surfaces an upload failure via the alert dialog and stays open", async () => {
    get.mockResolvedValue({ data: [] });
    upload.mockRejectedValue(new Error("nope"));
    const { onSelect, onClose } = renderPicker();
    await screen.findByText("No uploads yet");

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "x.png")] } });

    expect(await screen.findByText("nope")).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("AssetPicker presentational helpers", () => {
  it("AssetSkeletonGrid renders eight placeholder tiles", () => {
    const { container } = render(<AssetSkeletonGrid />);
    expect(container.querySelectorAll(".pc-skeleton")).toHaveLength(8);
  });

  it("AssetEmptyState shows the empty copy", () => {
    render(<AssetEmptyState />);
    expect(screen.getByText("No uploads yet")).toBeInTheDocument();
    expect(screen.getByText("Upload an image to get started.")).toBeInTheDocument();
  });

  it("AssetGrid renders an image tile and reports the picked url", () => {
    const onPick = vi.fn();
    render(<AssetGrid assets={[asset("a")]} onPick={onPick} />);
    fireEvent.click(screen.getByRole("img", { name: "a" }));
    expect(onPick).toHaveBeenCalledWith("/u/a");
  });

  it("AssetGrid renders the filename for non-image assets", () => {
    render(
      <AssetGrid
        assets={[asset("doc", { type: "application/pdf", name: "report.pdf" })]}
        onPick={vi.fn()}
      />,
    );
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
