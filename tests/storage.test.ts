import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir, unlink } from "fs/promises";
import { saveFile, deleteFile } from "@/lib/storage";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}));

const createClientMock = createClient as unknown as Mock;
const writeFileMock = writeFile as unknown as Mock;
const mkdirMock = mkdir as unknown as Mock;
const unlinkMock = unlink as unknown as Mock;

function withSupabase() {
  process.env.SUPABASE_URL = "https://proj.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
}

function fakeClient(over: {
  uploadError?: { message: string } | null;
  removeError?: { message: string } | null;
  publicUrl?: string;
}) {
  const upload = vi.fn().mockResolvedValue({ error: over.uploadError ?? null });
  const remove = vi.fn().mockResolvedValue({ error: over.removeError ?? null });
  const getPublicUrl = vi
    .fn()
    .mockReturnValue({ data: { publicUrl: over.publicUrl ?? "https://proj.supabase.co/x" } });
  const from = vi.fn().mockReturnValue({ upload, remove, getPublicUrl });
  createClientMock.mockReturnValue({ storage: { from } });
  return { upload, remove, getPublicUrl, from };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  writeFileMock.mockResolvedValue(undefined);
  mkdirMock.mockResolvedValue(undefined);
  unlinkMock.mockResolvedValue(undefined);
});

describe("saveFile (Supabase)", () => {
  it("uploads with upsert and returns the public URL", async () => {
    withSupabase();
    const { upload, from, getPublicUrl } = fakeClient({
      publicUrl:
        "https://proj.supabase.co/storage/v1/object/public/pagistry-bucket/thumbnails/p1.png",
    });
    const buf = Buffer.from("png");
    const url = await saveFile("thumbnails/p1.png", buf, "image/png");
    expect(url).toBe(
      "https://proj.supabase.co/storage/v1/object/public/pagistry-bucket/thumbnails/p1.png",
    );
    expect(from).toHaveBeenCalledWith("pagistry-bucket");
    expect(upload).toHaveBeenCalledWith("thumbnails/p1.png", buf, {
      contentType: "image/png",
      upsert: true,
    });
    expect(getPublicUrl).toHaveBeenCalledWith("thumbnails/p1.png");
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("throws when the upload errors", async () => {
    withSupabase();
    fakeClient({ uploadError: { message: "denied" } });
    await expect(saveFile("a.png", Buffer.from("x"), "image/png")).rejects.toThrow(
      /storage upload failed: denied/,
    );
  });
});

describe("saveFile (local fallback)", () => {
  it("writes under public/uploads and returns a relative URL when Supabase is unconfigured", async () => {
    const buf = Buffer.from("data");
    const url = await saveFile("logo-x.png", buf, "image/png");
    expect(url).toBe("/uploads/logo-x.png");
    expect(createClientMock).not.toHaveBeenCalled();
    expect(mkdirMock).toHaveBeenCalledWith(expect.stringContaining("public/uploads"), {
      recursive: true,
    });
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining("public/uploads/logo-x.png"),
      buf,
    );
  });
});

describe("deleteFile", () => {
  it("removes the object via Supabase", async () => {
    withSupabase();
    const { remove } = fakeClient({});
    await deleteFile("thumbnails/p1.png");
    expect(remove).toHaveBeenCalledWith(["thumbnails/p1.png"]);
    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it("swallows local unlink errors when Supabase is unconfigured", async () => {
    unlinkMock.mockRejectedValue(new Error("missing"));
    await expect(deleteFile("thumbnails/gone.png")).resolves.toBeUndefined();
    expect(unlinkMock).toHaveBeenCalledWith(
      expect.stringContaining("public/uploads/thumbnails/gone.png"),
    );
  });
});
