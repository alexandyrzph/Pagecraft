import { describe, it, expect } from "vitest";
import { createLimiter } from "@/lib/thumbnails/queue";

/** A promise whose resolution we control manually. */
function deferred<T = void>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("createLimiter", () => {
  it("never runs more than `max` tasks at once", async () => {
    const limit = createLimiter(2);
    let active = 0;
    let peak = 0;
    const gates = Array.from({ length: 5 }, () => deferred());

    const runs = gates.map((g, i) =>
      limit(async () => {
        active++;
        peak = Math.max(peak, active);
        await g.promise;
        active--;
        return i;
      }),
    );

    // Let the limiter schedule the first batch.
    await Promise.resolve();
    await Promise.resolve();
    expect(active).toBe(2);

    // Resolve gates one at a time; peak must never exceed 2.
    for (const g of gates) {
      g.resolve();
      await Promise.resolve();
      await Promise.resolve();
    }

    const results = await Promise.all(runs);
    expect(results.sort()).toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  it("propagates task rejections to the caller", async () => {
    const limit = createLimiter(1);
    await expect(
      limit(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
