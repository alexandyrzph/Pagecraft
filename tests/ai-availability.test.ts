import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn() },
}));

import { api } from "@/lib/api/client";
import { loadAiAvailability } from "@/lib/ai-availability";

const get = api.get as unknown as Mock;
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("loadAiAvailability", () => {
  beforeEach(() => get.mockReset());

  it("reports true when at least one provider is returned", async () => {
    get.mockResolvedValueOnce({ data: { providers: ["mock"] } });
    const setHasAi = vi.fn();
    loadAiAvailability(setHasAi);
    await flush();
    expect(setHasAi).toHaveBeenCalledWith(true);
  });

  it("reports false for an empty or missing provider list", async () => {
    get.mockResolvedValueOnce({ data: { providers: [] } });
    const setHasAi = vi.fn();
    loadAiAvailability(setHasAi);
    await flush();
    expect(setHasAi).toHaveBeenCalledWith(false);
  });

  it("swallows fetch errors without throwing", async () => {
    get.mockRejectedValueOnce(new Error("offline"));
    const setHasAi = vi.fn();
    expect(() => loadAiAvailability(setHasAi)).not.toThrow();
    await flush();
    expect(setHasAi).not.toHaveBeenCalled();
  });
});
