// Render tests for <RichTextToolbar/> and its extracted parts. Drives the
// component's visibility gates (no editor / unfocused / unpositionable), the
// formatting + link + AI controls, and the AI-providers effect. A fake Tiptap
// editor stands in for the real one (only the surface the toolbar touches).
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

// Strip framer-motion animation props so motion.* render as plain DOM.
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const MOTION_PROPS = new Set(["initial", "animate", "exit", "transition", "layout"]);
  const passthrough = (Tag: string) =>
    function MotionStub(props: Record<string, unknown>) {
      const rest: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (k !== "children" && !MOTION_PROPS.has(k)) rest[k] = v;
      }
      return React.createElement(Tag, rest, props.children as React.ReactNode);
    };
  return {
    motion: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }) as Record<
      string,
      unknown
    >,
  };
});

import { api } from "@/lib/api/client";
import type { Editor } from "@tiptap/react";
import type { FrameInfo } from "@/components/editor/iframe-context";
import { useRichText } from "@/store/richtext";
import { RichTextToolbar } from "@/components/editor/RichTextToolbar";
import { getToolbarPosition, setEditorLink } from "@/components/editor/RichTextToolbar.helpers";
import { AI_ACTIONS } from "@/components/editor/RichTextToolbar.parts";

const get = api.get as unknown as Mock;
const post = api.post as unknown as Mock;

type Chain = Record<string, (...args: unknown[]) => Chain> & { run: () => boolean };

function makeChain(log: string[]): Chain {
  const chain = {} as Chain;
  const handler: ProxyHandler<Chain> = {
    get(_t, prop: string) {
      if (prop === "run") return () => true;
      return (...args: unknown[]) => {
        log.push(args.length ? `${prop}(${JSON.stringify(args)})` : prop);
        return proxy;
      };
    },
  };
  const proxy = new Proxy(chain, handler);
  return proxy;
}

type FakeEditorOpts = {
  isFocused?: boolean;
  active?: Record<string, boolean>;
  throwCoords?: boolean;
  selectionEmpty?: boolean;
  text?: string;
  selectedText?: string;
  log?: string[];
};

function makeEditor(opts: FakeEditorOpts = {}): Editor {
  const log = opts.log ?? [];
  const active = opts.active ?? {};
  const selectionEmpty = opts.selectionEmpty ?? true;
  const editor = {
    isFocused: opts.isFocused ?? true,
    isActive: (mark: string) => Boolean(active[mark]),
    chain: () => {
      log.push("chain");
      return makeChain(log);
    },
    getText: () => opts.text ?? "doc text",
    state: {
      selection: { from: 5, to: 9, empty: selectionEmpty },
      doc: { textBetween: () => opts.selectedText ?? "sel text" },
    },
    view: {
      coordsAtPos: () => {
        if (opts.throwCoords) throw new Error("no coords");
        return { left: 120, top: 200 };
      },
    },
  } as unknown as Editor;
  return editor;
}

function setEditor(editor: Editor | null) {
  act(() => {
    useRichText.setState({ editor });
  });
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockResolvedValue({ data: { providers: [] } });
  useRichText.setState({ editor: null, tick: 0 });
});

describe("RichTextToolbar — visibility gates", () => {
  it("renders nothing when there is no editor", () => {
    const { container } = render(<RichTextToolbar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the editor is blurred and no popovers are open", async () => {
    setEditor(makeEditor({ isFocused: false }));
    const { container } = render(<RichTextToolbar />);
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when a position can't be computed", async () => {
    setEditor(makeEditor({ throwCoords: true }));
    const { container } = render(<RichTextToolbar />);
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("renders the toolbar when the editor is focused and positionable", async () => {
    setEditor(makeEditor());
    render(<RichTextToolbar />);
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.getByTitle("Bold (⌘B)")).toBeInTheDocument();
  });
});

describe("RichTextToolbar — formatting buttons", () => {
  it("toggles bold / italic / strike / lists via the editor chain", async () => {
    const log: string[] = [];
    setEditor(makeEditor({ log }));
    render(<RichTextToolbar />);
    await waitFor(() => expect(get).toHaveBeenCalled());

    fireEvent.click(screen.getByTitle("Bold (⌘B)"));
    fireEvent.click(screen.getByTitle("Italic (⌘I)"));
    fireEvent.click(screen.getByTitle("Strikethrough"));
    fireEvent.click(screen.getByTitle("Bullet list"));
    fireEvent.click(screen.getByTitle("Numbered list"));

    expect(log).toContain("toggleBold");
    expect(log).toContain("toggleItalic");
    expect(log).toContain("toggleStrike");
    expect(log).toContain("toggleBulletList");
    expect(log).toContain("toggleOrderedList");
  });

  it("reflects active marks via aria/title state (active class applied)", async () => {
    setEditor(makeEditor({ active: { bold: true } }));
    render(<RichTextToolbar />);
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.getByTitle("Bold (⌘B)").className).toContain("bg-indigo-500");
  });
});

describe("RichTextToolbar — link controls", () => {
  it("shows the unlink button and removes the link when a link is active", async () => {
    const log: string[] = [];
    setEditor(makeEditor({ active: { link: true }, log }));
    render(<RichTextToolbar />);
    await waitFor(() => expect(get).toHaveBeenCalled());

    fireEvent.click(screen.getByTitle("Remove link"));
    expect(log).toContain("unsetLink");
  });

  it("opens the link input, applies a URL on Enter, and closes", async () => {
    const log: string[] = [];
    setEditor(makeEditor({ log }));
    render(<RichTextToolbar />);
    await waitFor(() => expect(get).toHaveBeenCalled());

    fireEvent.click(screen.getByTitle("Add link"));
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: " https://x.dev " },
    });
    fireEvent.keyDown(screen.getByPlaceholderText("https://…"), { key: "Enter" });

    expect(log).toContain('setLink([{"href":"https://x.dev"}])');
    expect(screen.queryByPlaceholderText("https://…")).toBeNull();
  });

  it("applying an empty URL unsets the link instead of setting it", async () => {
    const log: string[] = [];
    setEditor(makeEditor({ log }));
    render(<RichTextToolbar />);
    await waitFor(() => expect(get).toHaveBeenCalled());

    fireEvent.click(screen.getByTitle("Add link"));
    fireEvent.keyDown(screen.getByPlaceholderText("https://…"), { key: "Enter" });
    expect(log).toContain("unsetLink");
  });

  it("closes the link input on Escape without applying", async () => {
    setEditor(makeEditor());
    render(<RichTextToolbar />);
    await waitFor(() => expect(get).toHaveBeenCalled());

    fireEvent.click(screen.getByTitle("Add link"));
    fireEvent.change(screen.getByPlaceholderText("https://…"), { target: { value: "typed" } });
    fireEvent.keyDown(screen.getByPlaceholderText("https://…"), { key: "Escape" });
    expect(screen.queryByPlaceholderText("https://…")).toBeNull();
  });
});

describe("RichTextToolbar — AI menu", () => {
  it("is hidden when no providers are configured", async () => {
    get.mockResolvedValue({ data: { providers: [] } });
    setEditor(makeEditor());
    render(<RichTextToolbar />);
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.queryByTitle("Improve with AI")).toBeNull();
  });

  it("appears when providers exist and lists every AI action", async () => {
    get.mockResolvedValue({ data: { providers: ["mock"] } });
    setEditor(makeEditor());
    render(<RichTextToolbar />);

    const trigger = await screen.findByTitle("Improve with AI");
    fireEvent.click(trigger);
    expect(screen.getByText("Improve writing")).toBeInTheDocument();
    expect(screen.getByText("Make shorter")).toBeInTheDocument();
    expect(screen.getByText("More casual")).toBeInTheDocument();
  });

  it("runs an AI rewrite over the selection (insertContent) and resolves", async () => {
    get.mockResolvedValue({ data: { providers: ["mock"] } });
    post.mockResolvedValue({ data: { text: "rewritten" } });
    const log: string[] = [];
    setEditor(makeEditor({ selectionEmpty: false, log }));
    render(<RichTextToolbar />);

    const trigger = await screen.findByTitle("Improve with AI");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText("Improve writing"));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/ai", {
        mode: "rewrite",
        action: "improve",
        text: "sel text",
      }),
    );
    await waitFor(() => expect(log).toContain('insertContent(["rewritten"])'));
  });

  it("rewrites the whole doc (setContent) when there is no selection", async () => {
    get.mockResolvedValue({ data: { providers: ["mock"] } });
    post.mockResolvedValue({ data: { text: "whole" } });
    const log: string[] = [];
    setEditor(makeEditor({ selectionEmpty: true, log }));
    render(<RichTextToolbar />);

    const trigger = await screen.findByTitle("Improve with AI");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText("Make longer"));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/ai", {
        mode: "rewrite",
        action: "expand",
        text: "doc text",
      }),
    );
    await waitFor(() => expect(log).toContain('setContent(["whole"])'));
  });
});

describe("RichTextToolbar helpers (jsdom — window-dependent)", () => {
  function editorAt(left: number, top: number): Editor {
    return {
      state: { selection: { from: 3 } },
      view: { coordsAtPos: () => ({ left, top }) },
    } as unknown as Editor;
  }

  function linkChain(): { editor: Editor; log: string[] } {
    const log: string[] = [];
    const chain = makeChain(log);
    return { editor: { chain: () => chain } as unknown as Editor, log };
  }

  it("AI_ACTIONS lists the six rewrite actions in order with labels", () => {
    expect(AI_ACTIONS.map((a) => a.key)).toEqual([
      "improve",
      "shorten",
      "expand",
      "grammar",
      "professional",
      "casual",
    ]);
    expect(AI_ACTIONS.every((a) => a.label.length > 0)).toBe(true);
  });

  it("getToolbarPosition offsets by the frame rect and lifts above the caret", () => {
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    const frame = {
      el: { getBoundingClientRect: () => ({ left: 10, top: 20 }) },
    } as unknown as FrameInfo;
    expect(getToolbarPosition(editorAt(100, 200), frame)).toEqual({ left: 110, top: 172 });
  });

  it("getToolbarPosition uses zero offset with no frame and clamps to the right edge", () => {
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    expect(getToolbarPosition(editorAt(5000, 300), null)).toEqual({ left: 720, top: 252 });
  });

  it("getToolbarPosition floors left at 8 and top at 56", () => {
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    expect(getToolbarPosition(editorAt(-100, 0), null)).toEqual({ left: 8, top: 56 });
  });

  it("getToolbarPosition returns null when coordsAtPos throws", () => {
    const editor = {
      state: { selection: { from: 3 } },
      view: {
        coordsAtPos: () => {
          throw new Error("detached");
        },
      },
    } as unknown as Editor;
    expect(getToolbarPosition(editor, null)).toBeNull();
  });

  it("setEditorLink extends the mark range and sets the href when a URL is given", () => {
    const { editor, log } = linkChain();
    setEditorLink(editor, "https://a.dev");
    expect(log).toContain('extendMarkRange(["link"])');
    expect(log).toContain('setLink([{"href":"https://a.dev"}])');
  });

  it("setEditorLink unsets the link when the URL is empty", () => {
    const { editor, log } = linkChain();
    setEditorLink(editor, "");
    expect(log).toContain("unsetLink");
    expect(log.some((c) => c.startsWith("setLink"))).toBe(false);
  });
});
