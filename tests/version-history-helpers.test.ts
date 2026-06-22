// Unit tests for the pure helpers extracted from VersionHistory: the
// `relativeTime` formatter (every bucket: just now / minutes / hours / days /
// absolute date) and the `dotColor` label→class lookup (both known labels and
// the fallback).
import { describe, it, expect, vi, afterEach } from "vitest";
import { relativeTime, dotColor } from "@/components/editor/VersionHistory.helpers";

function isoMinutesAgo(min: number): string {
  return new Date(Date.now() - min * 60000).toISOString();
}

describe("relativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' under a minute", () => {
    expect(relativeTime(isoMinutesAgo(0))).toBe("just now");
  });

  it("returns minutes for under an hour", () => {
    expect(relativeTime(isoMinutesAgo(5))).toBe("5m ago");
    expect(relativeTime(isoMinutesAgo(59))).toBe("59m ago");
  });

  it("returns hours for under a day", () => {
    expect(relativeTime(isoMinutesAgo(60))).toBe("1h ago");
    expect(relativeTime(isoMinutesAgo(60 * 23))).toBe("23h ago");
  });

  it("returns days for under a week", () => {
    expect(relativeTime(isoMinutesAgo(60 * 24))).toBe("1d ago");
    expect(relativeTime(isoMinutesAgo(60 * 24 * 6))).toBe("6d ago");
  });

  it("returns a locale date string at a week or more", () => {
    const iso = isoMinutesAgo(60 * 24 * 8);
    expect(relativeTime(iso)).toBe(new Date(iso).toLocaleDateString());
  });
});

describe("dotColor", () => {
  it("maps known labels to their colors", () => {
    expect(dotColor("Published")).toBe("bg-emerald-500");
    expect(dotColor("Before restore")).toBe("bg-amber-400");
  });

  it("falls back to indigo for any other label", () => {
    expect(dotColor("Manual save")).toBe("bg-indigo-400");
    expect(dotColor("")).toBe("bg-indigo-400");
  });
});
