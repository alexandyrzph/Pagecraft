import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Editor } from "@tiptap/react";

const postMock = vi.fn();
vi.mock("@/lib/api/client", () => ({ api: { post: (...args: unknown[]) => postMock(...args) } }));

import { runAiRewrite } from "@/components/editor/RichTextToolbar.helpers";
import { endpoints } from "@/lib/api/endpoints";

function makeChain() {
  const calls: string[] = [];
  const chain: Record<string, unknown> = {};
  for (const m of ["focus", "insertContent", "setContent", "run"]) {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push(args.length ? `${m}:${String(args[0])}` : m);
      return chain;
    });
  }
  chain.__calls = calls;
  return chain;
}

function makeEditor(opts: { empty: boolean; between?: string; full?: string }) {
  const chain = makeChain();
  const editor = {
    chain: () => chain,
    getText: () => opts.full ?? "",
    state: {
      selection: { empty: opts.empty, from: 1, to: 5 },
      doc: { textBetween: () => opts.between ?? "" },
    },
    __chain: chain,
  };
  return editor as unknown as Editor & { __chain: ReturnType<typeof makeChain> };
}

function flags() {
  const setAiBusy = vi.fn();
  const setAiOpen = vi.fn();
  return { setAiBusy, setAiOpen };
}

beforeEach(() => {
  postMock.mockReset();
});

describe("runAiRewrite", () => {
  it("rewrites a non-empty selection via insertContent", async () => {
    const editor = makeEditor({ empty: false, between: "old words" });
    postMock.mockResolvedValue({ data: { text: "new words" } });
    const { setAiBusy, setAiOpen } = flags();

    await runAiRewrite(editor, "shorten", false, setAiBusy, setAiOpen);

    expect(postMock).toHaveBeenCalledWith(endpoints.ai, {
      mode: "rewrite",
      action: "shorten",
      text: "old words",
    });
    const calls = (editor.__chain as unknown as { __calls: string[] }).__calls;
    expect(calls).toContain("insertContent:new words");
    expect(calls).not.toContain("setContent:new words");
    expect(setAiBusy).toHaveBeenNthCalledWith(1, true);
    expect(setAiBusy).toHaveBeenLastCalledWith(false);
    expect(setAiOpen).toHaveBeenCalledWith(false);
  });

  it("rewrites the whole document via setContent when selection is empty", async () => {
    const editor = makeEditor({ empty: true, full: "all the document text" });
    postMock.mockResolvedValue({ data: { text: "rewritten doc" } });
    const { setAiBusy, setAiOpen } = flags();

    await runAiRewrite(editor, "improve", false, setAiBusy, setAiOpen);

    expect(postMock).toHaveBeenCalledWith(endpoints.ai, {
      mode: "rewrite",
      action: "improve",
      text: "all the document text",
    });
    const calls = (editor.__chain as unknown as { __calls: string[] }).__calls;
    expect(calls).toContain("setContent:rewritten doc");
    expect(calls).not.toContain("insertContent:rewritten doc");
    expect(setAiBusy).toHaveBeenLastCalledWith(false);
    expect(setAiOpen).toHaveBeenCalledWith(false);
  });

  it("does nothing when the resolved text is blank (early return)", async () => {
    const editor = makeEditor({ empty: false, between: "   " });
    const { setAiBusy, setAiOpen } = flags();

    await runAiRewrite(editor, "shorten", false, setAiBusy, setAiOpen);

    expect(postMock).not.toHaveBeenCalled();
    expect(setAiBusy).not.toHaveBeenCalled();
    expect(setAiOpen).not.toHaveBeenCalled();
  });

  it("does nothing when already busy (early return)", async () => {
    const editor = makeEditor({ empty: false, between: "some text" });
    const { setAiBusy, setAiOpen } = flags();

    await runAiRewrite(editor, "shorten", true, setAiBusy, setAiOpen);

    expect(postMock).not.toHaveBeenCalled();
    expect(setAiBusy).not.toHaveBeenCalled();
    expect(setAiOpen).not.toHaveBeenCalled();
  });

  it("skips editing when the response has no text but still clears busy/open", async () => {
    const editor = makeEditor({ empty: false, between: "some text" });
    postMock.mockResolvedValue({ data: {} });
    const { setAiBusy, setAiOpen } = flags();

    await runAiRewrite(editor, "shorten", false, setAiBusy, setAiOpen);

    const calls = (editor.__chain as unknown as { __calls: string[] }).__calls;
    expect(calls).not.toContain("insertContent:undefined");
    expect(calls).toEqual([]);
    expect(setAiBusy).toHaveBeenNthCalledWith(1, true);
    expect(setAiBusy).toHaveBeenLastCalledWith(false);
    expect(setAiOpen).toHaveBeenCalledWith(false);
  });

  it("swallows API errors and still resets busy/open in finally", async () => {
    const editor = makeEditor({ empty: true, full: "doc text" });
    postMock.mockRejectedValue(new Error("network down"));
    const { setAiBusy, setAiOpen } = flags();

    await expect(
      runAiRewrite(editor, "improve", false, setAiBusy, setAiOpen),
    ).resolves.toBeUndefined();

    expect(setAiBusy).toHaveBeenNthCalledWith(1, true);
    expect(setAiBusy).toHaveBeenLastCalledWith(false);
    expect(setAiOpen).toHaveBeenCalledWith(false);
  });
});
