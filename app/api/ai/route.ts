import axios from "axios";
import { externalApi } from "@/lib/api/endpoints";
import { requireApiUser } from "@/lib/auth/auth";
import { withRole } from "@/lib/api/api-handler";
import { json, badRequest, error } from "@/lib/api/api-response";
import { instrumentApi, logger } from "@/lib/observability";
import { enforce } from "@/lib/rate-limit";
import {
  sectionSystemPrompt,
  pageSystemPrompt,
  REWRITE_SYSTEM,
  REWRITE_INSTRUCTIONS,
  DESIGN_STYLE_KEYS,
  extractJsonArray,
  sanitizeGeneratedBlocks,
  MOCK_BLOCKS,
  MOCK_PAGE,
} from "@/lib/ai";

export const dynamic = "force-dynamic";

// Generation uses a strong model (design taste matters most); the cheap
// rewrite/copy-edit path stays on a small, fast model.
const GEN_MODEL = {
  anthropic: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  openai: process.env.OPENAI_MODEL || "gpt-4o",
};
const REWRITE_MODEL = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
};

function available() {
  const list: string[] = [];
  if (process.env.ANTHROPIC_API_KEY) list.push("anthropic");
  if (process.env.OPENAI_API_KEY) list.push("openai");
  if (process.env.AI_MOCK === "1") list.push("mock");
  return list;
}

// GET /api/ai — which providers are configured
export async function GET() {
  const _auth = await requireApiUser();
  if ("response" in _auth) return _auth.response;
  const providers = available();
  return json({ providers, default: providers[0] ?? null });
}

async function callAnthropic(
  model: string,
  system: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  try {
    const { data } = await axios.post(
      externalApi.anthropic.messages,
      {
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      },
    );
    return data?.content?.[0]?.text ?? "";
  } catch (e) {
    if (axios.isAxiosError(e) && e.response) {
      throw new Error(
        `Anthropic ${e.response.status}: ${JSON.stringify(e.response.data).slice(0, 200)}`,
      );
    }
    throw e;
  }
}

async function callOpenAI(
  model: string,
  system: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  try {
    const { data } = await axios.post(
      externalApi.openai.chatCompletions,
      {
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } },
    );
    return data?.choices?.[0]?.message?.content ?? "";
  } catch (e) {
    if (axios.isAxiosError(e) && e.response) {
      throw new Error(
        `OpenAI ${e.response.status}: ${JSON.stringify(e.response.data).slice(0, 200)}`,
      );
    }
    throw e;
  }
}

async function callModel(
  provider: string,
  models: { anthropic: string; openai: string },
  system: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  return provider === "openai"
    ? callOpenAI(models.openai, system, prompt, maxTokens, temperature)
    : callAnthropic(models.anthropic, system, prompt, maxTokens, temperature);
}

// --- rewrite / improve text ---
async function handleRewrite(provider: string, text: string, action: string): Promise<Response> {
  if (!text) return badRequest("No text to rewrite");
  const instruction = REWRITE_INSTRUCTIONS[action] ?? REWRITE_INSTRUCTIONS.improve;
  if (provider === "mock") {
    return json({ provider, text: `${text} (improved)` });
  }
  const out = await callModel(
    provider,
    REWRITE_MODEL,
    REWRITE_SYSTEM,
    `${instruction}:\n\n${text}`,
    1000,
    0.5,
  );
  const cleaned = out.trim().replace(/^["']|["']$/g, "");
  if (!cleaned) return error(422, "No rewrite returned");
  return json({ provider, text: cleaned });
}

// --- generate section(s) or a whole page ---
async function handleGenerate(
  provider: string,
  mode: string,
  prompt: string,
  rawStyle: string,
): Promise<Response> {
  if (!prompt) return badRequest("Prompt is required");
  const isPage = mode === "page";
  if (provider === "mock") {
    return json({
      provider,
      blocks: sanitizeGeneratedBlocks(isPage ? MOCK_PAGE : MOCK_BLOCKS),
    });
  }
  const style = DESIGN_STYLE_KEYS.includes(rawStyle) ? rawStyle : "auto";
  const system = isPage ? pageSystemPrompt(style) : sectionSystemPrompt(style);
  // styled output is larger; give it room. Higher temperature → more distinctive.
  const t0 = performance.now();
  const raw = await callModel(provider, GEN_MODEL, system, prompt, isPage ? 8000 : 4000, 0.85);
  logger.info("ai.generate", {
    provider,
    mode,
    style,
    upstream_ms: Math.round(performance.now() - t0),
  });
  const blocks = sanitizeGeneratedBlocks(extractJsonArray(raw));
  if (!blocks.length) {
    return error(422, "The model returned no usable blocks. Try rephrasing.");
  }
  return json({ provider, blocks });
}

// POST /api/ai — generate blocks from a prompt
export async function POST(req: Request) {
  const limited = enforce(req, "ai", 20, 60_000);
  if (limited) return limited;

  return instrumentApi("/api/ai", req, () =>
    withRole("EDITOR", async () => {
      const providers = available();
      if (!providers.length) {
        return badRequest(
          "No AI provider configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.",
        );
      }

      const body = await req.json().catch(() => ({}));
      const mode = body.mode === "rewrite" ? "rewrite" : body.mode === "page" ? "page" : "generate";
      const provider = providers.includes(body.provider) ? body.provider : providers[0];

      try {
        if (mode === "rewrite") {
          return await handleRewrite(
            provider,
            String(body.text || "")
              .slice(0, 4000)
              .trim(),
            body.action,
          );
        }
        return await handleGenerate(
          provider,
          mode,
          String(body.prompt || "")
            .slice(0, 1000)
            .trim(),
          body.style,
        );
      } catch (e) {
        return error(502, e instanceof Error ? e.message : "Generation failed");
      }
    }),
  );
}
