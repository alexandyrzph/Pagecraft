import { describe, it, expect, beforeAll, beforeEach, afterAll, vi, type Mock } from "vitest";
import axios from "axios";

const state = vi.hoisted(() => ({ roleCalls: [] as string[] }));

vi.mock("@/lib/api/api-handler", () => ({
  withRole: (min: string, fn: () => unknown) => {
    state.roleCalls.push(min);
    return fn();
  },
}));

vi.mock("@/lib/observability", () => ({
  instrumentApi: (_route: string, _req: Request, fn: () => unknown) => fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    isAxiosError: vi.fn(() => false),
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

const post = axios.post as unknown as Mock;
const isAxiosError = axios.isAxiosError as unknown as Mock;

const ORIG = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  mock: process.env.AI_MOCK,
};

function clearEnv() {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.AI_MOCK;
}

function restore(key: string, value: string | undefined) {
  if (value === undefined) Reflect.deleteProperty(process.env, key);
  else process.env[key] = value;
}

function anthropicReply(text: string) {
  return { data: { content: [{ text }] } };
}

function openaiReply(content: string) {
  return { data: { choices: [{ message: { content } }] } };
}

async function callPost(body: unknown, raw?: string) {
  const { POST } = await import("@/app/api/ai/route");
  const init =
    raw !== undefined
      ? { method: "POST", body: raw }
      : { method: "POST", body: JSON.stringify(body) };
  return POST(new Request("http://x/api/ai", init));
}

// Importing the route transitively runs the project's dotenv load (which
// repopulates process.env). Trigger that one-time module eval up front so the
// per-test clearEnv() below actually sticks.
beforeAll(async () => {
  await import("@/app/api/ai/route");
});

beforeEach(() => {
  clearEnv();
  state.roleCalls = [];
  post.mockReset();
  isAxiosError.mockReset();
  isAxiosError.mockReturnValue(false);
});

afterAll(() => {
  restore("ANTHROPIC_API_KEY", ORIG.anthropic);
  restore("OPENAI_API_KEY", ORIG.openai);
  restore("AI_MOCK", ORIG.mock);
});

describe("POST /api/ai — provider gating", () => {
  it("400s when no provider is configured", async () => {
    const res = await callPost({ mode: "generate", prompt: "hi" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/No AI provider/);
    expect(state.roleCalls).toContain("EDITOR");
  });

  it("falls back to the first provider when body.provider is unknown", async () => {
    process.env.AI_MOCK = "1";
    const res = await callPost({ mode: "generate", prompt: "hi", provider: "bogus" });
    expect(res.status).toBe(200);
    expect((await res.json()).provider).toBe("mock");
  });

  it("honors an explicit, supported provider", async () => {
    process.env.AI_MOCK = "1";
    const res = await callPost({ mode: "generate", prompt: "hi", provider: "mock" });
    expect((await res.json()).provider).toBe("mock");
  });

  it("treats a non-JSON body as empty (Prompt is required)", async () => {
    process.env.AI_MOCK = "1";
    const res = await callPost(undefined, "not json {");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Prompt is required/);
  });
});

describe("handleGenerate — mock provider", () => {
  it("returns canned section blocks for generate mode", async () => {
    process.env.AI_MOCK = "1";
    const res = await callPost({ mode: "generate", prompt: "a landing hero" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe("mock");
    expect(Array.isArray(body.blocks)).toBe(true);
    expect(body.blocks.length).toBeGreaterThan(0);
    expect(post).not.toHaveBeenCalled();
  });

  it("returns a canned full page for page mode", async () => {
    process.env.AI_MOCK = "1";
    const res = await callPost({ mode: "page", prompt: "marketing site" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.blocks.length).toBeGreaterThan(0);
    expect(body.blocks.some((b: { type: string }) => b.type === "navbar")).toBe(true);
  });

  it("400s on an empty prompt", async () => {
    process.env.AI_MOCK = "1";
    const res = await callPost({ mode: "generate", prompt: "   " });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Prompt is required/);
  });
});

describe("handleGenerate — real provider", () => {
  it("calls Anthropic, keeps a known style, and sanitizes the blocks", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    post.mockResolvedValue(
      anthropicReply('[{"type":"heading","props":{"text":"Hi","level":"h1"}}]'),
    );
    const res = await callPost({ mode: "generate", prompt: "make a hero", style: "glass" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe("anthropic");
    expect(body.blocks).toHaveLength(1);
    expect(body.blocks[0].type).toBe("heading");
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("calls Anthropic for page mode and tolerates an unknown style", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    post.mockResolvedValue(anthropicReply('[{"type":"text","props":{"text":"yo"}}]'));
    const res = await callPost({ mode: "page", prompt: "landing", style: "not-a-style" });
    expect(res.status).toBe(200);
    expect((await res.json()).blocks).toHaveLength(1);
  });

  it("calls OpenAI when that provider is selected", async () => {
    process.env.OPENAI_API_KEY = "k";
    post.mockResolvedValue(openaiReply('[{"type":"text","props":{"text":"hello"}}]'));
    const res = await callPost({ mode: "generate", prompt: "hi", provider: "openai" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe("openai");
    expect(body.blocks).toHaveLength(1);
  });

  it("422s when the model returns no usable blocks", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    post.mockResolvedValue(anthropicReply("no json here, sorry"));
    const res = await callPost({ mode: "generate", prompt: "make a hero" });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/no usable blocks/);
  });

  it("502s and surfaces a formatted Anthropic API error", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    isAxiosError.mockReturnValue(true);
    post.mockRejectedValue({ response: { status: 500, data: { error: "upstream boom" } } });
    const res = await callPost({ mode: "generate", prompt: "make a hero" });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/^Anthropic 500/);
  });

  it("502s on a non-axios upstream failure", async () => {
    process.env.OPENAI_API_KEY = "k";
    isAxiosError.mockReturnValue(false);
    post.mockRejectedValue(new Error("network down"));
    const res = await callPost({ mode: "generate", prompt: "make a hero", provider: "openai" });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("network down");
  });
});

describe("handleRewrite", () => {
  it("400s with no text", async () => {
    process.env.AI_MOCK = "1";
    const res = await callPost({ mode: "rewrite", text: "  ", action: "improve" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/No text to rewrite/);
  });

  it("returns the canned improvement for the mock provider", async () => {
    process.env.AI_MOCK = "1";
    const res = await callPost({ mode: "rewrite", text: "hello", action: "shorten" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe("mock");
    expect(body.text).toBe("hello (improved)");
  });

  it("rewrites via a real provider and strips wrapping quotes", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    post.mockResolvedValue(anthropicReply('"Polished copy"'));
    const res = await callPost({ mode: "rewrite", text: "rough copy", action: "professional" });
    expect(res.status).toBe(200);
    expect((await res.json()).text).toBe("Polished copy");
  });

  it("falls back to the improve instruction for an unknown action", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    post.mockResolvedValue(anthropicReply("Better text"));
    const res = await callPost({ mode: "rewrite", text: "x", action: "totally-unknown" });
    expect(res.status).toBe(200);
    const sentPrompt = post.mock.calls[0][1].messages[0].content as string;
    expect(sentPrompt).toMatch(/Improve the writing/);
  });

  it("422s when the rewrite comes back empty", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    post.mockResolvedValue(anthropicReply("   "));
    const res = await callPost({ mode: "rewrite", text: "x", action: "improve" });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/No rewrite returned/);
  });
});
