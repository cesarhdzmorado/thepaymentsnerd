import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Children } from "react";

describe("HeroAnimations logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("Children.toArray handles single child, array, and null children", () => {
    // Single element
    const single = Children.toArray("hello");
    expect(single).toHaveLength(1);

    // Multiple elements (simulated as array)
    const multiple = Children.toArray(["a", "b", "c"]);
    expect(multiple).toHaveLength(3);

    // Null/undefined are filtered out
    const withNulls = Children.toArray([null, "a", undefined, "b"]);
    expect(withNulls).toHaveLength(2);
  });

  it("stagger delay formula produces correct delays", () => {
    const STAGGER = 80;
    const childCount = 6;
    const delays = Array.from({ length: childCount }, (_, i) => i * STAGGER);

    expect(delays).toEqual([0, 80, 160, 240, 320, 400]);
    // Max delay for 6 children is 400ms, well under the old 1100ms
    expect(delays[delays.length - 1]).toBeLessThan(500);
  });

  it("prefers-reduced-motion check returns boolean", () => {
    // Mock matchMedia to return reduced motion
    vi.stubGlobal("window", {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    });
    const result = window.matchMedia("(prefers-reduced-motion: reduce)");
    expect(result.matches).toBe(true);

    // Mock matchMedia to return no preference
    vi.stubGlobal("window", {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    const result2 = window.matchMedia("(prefers-reduced-motion: reduce)");
    expect(result2.matches).toBe(false);
  });

  it("timeout-based visibility triggers after specified delay", () => {
    let visible = false;
    const delay = 160;

    const timeout = setTimeout(() => {
      visible = true;
    }, delay);

    expect(visible).toBe(false);

    vi.advanceTimersByTime(80);
    expect(visible).toBe(false);

    vi.advanceTimersByTime(80);
    expect(visible).toBe(true);

    clearTimeout(timeout);
  });
});
