// Pure-logic coverage for the AssetPicker helpers: drives `fetchAssets`
// (image vs all endpoint, array vs non-array vs error response) and
// `uploadPickedFiles` (empty early return, success select+close, partial-fail
// alert, busy reset in finally) by importing and calling them directly with
// mocked api/upload modules.
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/upload", async () => {
  const actual = await vi.importActual<typeof import("@/lib/upload")>("@/lib/upload");
  return { ...actual, uploadFile: vi.fn() };
});

import { api } from "@/lib/api/client";
import { uploadFile, type UploadedAsset } from "@/lib/upload";
import { fetchAssets, uploadPickedFiles } from "@/components/editor/AssetPicker.helpers";

const get = api.get as unknown as Mock;
const upload = uploadFile as unknown as Mock;

function asset(id: string, over: Partial<UploadedAsset> = {}): UploadedAsset {
  return { id, url: `/u/${id}`, name: id, type: "image/png", size: 10, ...over };
}

function fileList(...files: File[]): FileList {
  return files as unknown as FileList;
}

beforeEach(() => {
  get.mockReset();
  upload.mockReset();
});

describe("fetchAssets", () => {
  it("requests the image-scoped endpoint for kind=image and stores the array", async () => {
    const data = [asset("a"), asset("b")];
    get.mockResolvedValue({ data });
    const setAssets = vi.fn();
    const setLoading = vi.fn();

    fetchAssets("image", setAssets, setLoading);
    await new Promise((r) => setTimeout(r, 0));

    expect(get).toHaveBeenCalledWith("/api/assets?kind=image");
    expect(setAssets).toHaveBeenCalledWith(data);
    expect(setLoading).toHaveBeenCalledWith(false);
  });

  it("requests the unscoped endpoint for kind=all", async () => {
    get.mockResolvedValue({ data: [] });
    fetchAssets("all", vi.fn(), vi.fn());
    await new Promise((r) => setTimeout(r, 0));
    expect(get).toHaveBeenCalledWith("/api/assets");
  });

  it("falls back to an empty array when the response is not an array", async () => {
    get.mockResolvedValue({ data: { nope: true } });
    const setAssets = vi.fn();
    fetchAssets("image", setAssets, vi.fn());
    await new Promise((r) => setTimeout(r, 0));
    expect(setAssets).toHaveBeenCalledWith([]);
  });

  it("swallows request errors but still clears loading", async () => {
    get.mockRejectedValue(new Error("offline"));
    const setAssets = vi.fn();
    const setLoading = vi.fn();
    fetchAssets("image", setAssets, setLoading);
    await new Promise((r) => setTimeout(r, 0));
    expect(setAssets).not.toHaveBeenCalled();
    expect(setLoading).toHaveBeenCalledWith(false);
  });
});

describe("uploadPickedFiles", () => {
  const base = () => ({
    setBusy: vi.fn(),
    setAssets: vi.fn(),
    onSelect: vi.fn(),
    onClose: vi.fn(),
    alert: vi.fn().mockResolvedValue(undefined),
  });

  it("returns early on null files without touching busy", async () => {
    const deps = base();
    await uploadPickedFiles(null, deps);
    expect(deps.setBusy).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("returns early on an empty FileList", async () => {
    const deps = base();
    await uploadPickedFiles(fileList(), deps);
    expect(deps.setBusy).not.toHaveBeenCalled();
  });

  it("uploads each file, prepends them, and selects+closes on the first", async () => {
    const a = asset("a");
    const b = asset("b");
    upload.mockResolvedValueOnce(a).mockResolvedValueOnce(b);
    const deps = base();
    const f1 = new File(["1"], "1.png");
    const f2 = new File(["2"], "2.png");

    await uploadPickedFiles(fileList(f1, f2), deps);

    expect(upload).toHaveBeenCalledTimes(2);
    expect(deps.setBusy).toHaveBeenNthCalledWith(1, true);
    // Prepend updater: existing list goes after the freshly uploaded ones.
    const updater = deps.setAssets.mock.calls[0][0] as (a: UploadedAsset[]) => UploadedAsset[];
    expect(updater([asset("old")])).toEqual([a, b, asset("old")]);
    expect(deps.onSelect).toHaveBeenCalledWith(a.url);
    expect(deps.onClose).toHaveBeenCalledTimes(1);
    expect(deps.setBusy).toHaveBeenLastCalledWith(false);
    expect(deps.alert).not.toHaveBeenCalled();
  });

  it("does not select or close when nothing was uploaded", async () => {
    upload.mockImplementation(() => {
      throw "skip";
    });
    // A single file that fails leaves uploaded empty before the throw is caught.
    const deps = base();
    await uploadPickedFiles(fileList(new File(["x"], "x.png")), deps);
    expect(deps.onSelect).not.toHaveBeenCalled();
    expect(deps.onClose).not.toHaveBeenCalled();
  });

  it("alerts with the error message on failure and still resets busy", async () => {
    upload.mockRejectedValue(new Error("boom"));
    const deps = base();
    await uploadPickedFiles(fileList(new File(["x"], "x.png")), deps);
    expect(deps.alert).toHaveBeenCalledWith({ title: "Upload failed", message: "boom" });
    expect(deps.setBusy).toHaveBeenLastCalledWith(false);
  });

  it("uses a generic message when the rejection is not an Error", async () => {
    upload.mockRejectedValue("nope");
    const deps = base();
    await uploadPickedFiles(fileList(new File(["x"], "x.png")), deps);
    expect(deps.alert).toHaveBeenCalledWith({
      title: "Upload failed",
      message: "Please try again.",
    });
  });
});
