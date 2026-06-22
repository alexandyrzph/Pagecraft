// Render tests for the AI generate modal: drives the internal `generate`
// handler (section + page scope, success + error + early-return branches) by
// rendering the exported <AiGenerateModal/>, and exercises every branch of the
// exported <GenerateFooter/> sub-component directly.
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Block } from "@/lib/types";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { api } from "@/lib/api/client";
import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";
import { AiGenerateModal } from "@/components/editor/AiGenerateModal";
import { GenerateFooter } from "@/components/editor/AiGenerateModal.helpers";

const get = api.get as unknown as Mock;
const post = api.post as unknown as Mock;

function block(id: string): Block {
  return { id, type: "heading", props: { text: id }, styles: {}, children: [] };
}

const PLACEHOLDER = /hero section for an eco-friendly coffee brand/i;

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  // Two providers so the footer's <select> renders — awaiting it is the signal
  // that the async providers fetch has settled and `provider` is "mock".
  get.mockResolvedValue({ data: { providers: ["mock", "anthropic"] } });
  useEditor.getState().init({ id: "p1", title: "T", slug: "t", published: false, tree: [] });
  useEditorUI.getState().openAi();
});

describe("AiGenerateModal — generate()", () => {
  it("section scope: posts the prompt and inserts the returned blocks, then closes", async () => {
    post.mockResolvedValue({ data: { blocks: [block("b1")] } });
    render(<AiGenerateModal />);
    await screen.findByRole("combobox");

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: "A hero" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith("/api/ai", {
      prompt: "A hero",
      provider: "mock",
      style: "auto",
      mode: "generate",
    });
    await waitFor(() => expect(useEditor.getState().tree).toHaveLength(1));
    expect(useEditor.getState().tree[0].id).toBe("b1");
    await waitFor(() => expect(useEditorUI.getState().ai).toBeNull());
  });

  it("page scope: posts mode=page and replaces the tree", async () => {
    post.mockResolvedValue({ data: { blocks: [block("new")] } });
    render(<AiGenerateModal />);
    await screen.findByRole("combobox");

    fireEvent.click(screen.getByRole("button", { name: "Full page" }));
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: "Landing page" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/ai", {
        prompt: "Landing page",
        provider: "mock",
        style: "auto",
        mode: "page",
      }),
    );
    await waitFor(() => expect(useEditor.getState().tree).toEqual([block("new")]));
    expect(useEditorUI.getState().ai).toBeNull();
  });

  it("missing blocks in the response falls back to an empty array (no insert)", async () => {
    post.mockResolvedValue({ data: {} });
    render(<AiGenerateModal />);
    await screen.findByRole("combobox");

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: "Nothing" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useEditorUI.getState().ai).toBeNull());
    expect(useEditor.getState().tree).toHaveLength(0);
  });

  it("shows an error and stays open when generation fails", async () => {
    post.mockRejectedValue(new Error("boom"));
    render(<AiGenerateModal />);
    await screen.findByRole("combobox");

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: "A hero" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    expect(await screen.findByText("Network error — try again.")).toBeInTheDocument();
    // busy is reset in `finally`, so the button is interactive again …
    expect(screen.getByRole("button", { name: "Generate" })).not.toBeDisabled();
    // … and the modal did not close.
    expect(useEditorUI.getState().ai).not.toBeNull();
  });

  it("⌘↵ with an empty prompt returns early and never calls the API", async () => {
    render(<AiGenerateModal />);
    await screen.findByRole("combobox");

    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), { key: "Enter", metaKey: true });
    expect(post).not.toHaveBeenCalled();
  });

  it("⌃↵ with a prompt triggers generation via the textarea shortcut", async () => {
    post.mockResolvedValue({ data: { blocks: [block("k1")] } });
    render(<AiGenerateModal />);
    await screen.findByRole("combobox");

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.change(textarea, { target: { value: "Quick" } });
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  });

  it("renders the no-provider notice when no providers are configured", async () => {
    get.mockResolvedValue({ data: { providers: [] } });
    render(<AiGenerateModal />);
    expect(await screen.findByText("No AI provider configured")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull();
  });

  it("falls back to the no-provider notice when the providers request fails", async () => {
    get.mockRejectedValue(new Error("offline"));
    render(<AiGenerateModal />);
    expect(await screen.findByText("No AI provider configured")).toBeInTheDocument();
  });
});

describe("GenerateFooter", () => {
  const baseProps = {
    provider: "mock",
    onProviderChange: () => {},
    busy: false,
    prompt: "hi",
    onGenerate: () => {},
  };

  it("renders a labelled model select with >1 provider and reports changes", () => {
    const onProviderChange = vi.fn();
    render(
      <GenerateFooter
        {...baseProps}
        providers={["mock", "anthropic"]}
        onProviderChange={onProviderChange}
      />,
    );
    const select = screen.getByRole("combobox");
    expect(screen.getByRole("option", { name: "Mock" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Claude" })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "anthropic" } });
    expect(onProviderChange).toHaveBeenCalledWith("anthropic");
  });

  it("falls back to an unknown provider key as its own label", () => {
    render(<GenerateFooter {...baseProps} providers={["mock", "weird"]} />);
    expect(screen.getByRole("option", { name: "weird" })).toBeInTheDocument();
  });

  it("shows the keyboard hint when there is a single provider", () => {
    render(<GenerateFooter {...baseProps} providers={["mock"]} />);
    expect(screen.getByText("⌘↵ to generate")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("shows the keyboard hint when providers is null", () => {
    render(<GenerateFooter {...baseProps} providers={null} provider="" />);
    expect(screen.getByText("⌘↵ to generate")).toBeInTheDocument();
  });

  it("fires onGenerate when the enabled button is clicked", () => {
    const onGenerate = vi.fn();
    render(<GenerateFooter {...baseProps} providers={["mock"]} onGenerate={onGenerate} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("disables the button and shows a spinner label while busy", () => {
    render(<GenerateFooter {...baseProps} providers={["mock"]} busy />);
    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();
  });

  it("disables the button when the prompt is blank", () => {
    render(<GenerateFooter {...baseProps} providers={["mock"]} prompt="   " />);
    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
  });
});
