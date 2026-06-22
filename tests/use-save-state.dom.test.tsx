import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSaveState } from "@/lib/hooks/use-save-state";

describe("useSaveState", () => {
  it("runs the action, flips ok, calls onSuccess, then clears ok after the delay", async () => {
    vi.useFakeTimers();
    const onSuccess = vi.fn();
    const action = vi.fn(async () => {});
    const { result } = renderHook(() => useSaveState());

    expect(result.current.busy).toBe(false);
    await act(async () => {
      await result.current.run(action, onSuccess);
    });
    expect(action).toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
    expect(result.current.ok).toBe(true);
    expect(onSuccess).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.ok).toBe(false);
    vi.useRealTimers();
  });

  it("captures a server error message and stays not-ok", async () => {
    const { result } = renderHook(() => useSaveState());
    await act(async () => {
      await result.current.run(async () => {
        throw { isAxiosError: true, response: { data: { error: "Name taken" } } };
      });
    });
    expect(result.current.err).toBe("Name taken");
    expect(result.current.ok).toBe(false);
    expect(result.current.busy).toBe(false);
  });

  it("falls back to a generic error for non-axios failures", async () => {
    const { result } = renderHook(() => useSaveState());
    await act(async () => {
      await result.current.run(async () => {
        throw new Error("boom");
      });
    });
    expect(result.current.err).toBe("Could not save");
  });
});
