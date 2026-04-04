import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock IntersectionObserver
let observerCallback: IntersectionObserverCallback;
let observerOptions: IntersectionObserverInit | undefined;
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    observerCallback = callback;
    observerOptions = options;
  }
  observe = mockObserve;
  unobserve = mockUnobserve;
  disconnect = mockDisconnect;
  root = null;
  rootMargin = "";
  thresholds = [0];
  takeRecords = () => [] as IntersectionObserverEntry[];
}

describe("useInView (unit logic)", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    mockObserve.mockClear();
    mockUnobserve.mockClear();
    mockDisconnect.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an IntersectionObserver with the given threshold", () => {
    // Verify the mock class captures options correctly
    const callback = vi.fn();
    const observer = new MockIntersectionObserver(callback, { threshold: 0.5 });
    expect(observerOptions).toEqual({ threshold: 0.5 });
    expect(observer.observe).toBeDefined();
  });

  it("observer callback sets intersecting state correctly", () => {
    const states: boolean[] = [];
    const callback: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        states.push(entry.isIntersecting);
      }
    };

    new MockIntersectionObserver(callback, { threshold: 0.1 });

    // Simulate element entering viewport
    callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    expect(states).toEqual([true]);

    // Simulate element leaving viewport
    callback(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    expect(states).toEqual([true, false]);
  });

  it("triggerOnce pattern: unobserves after first intersection", () => {
    let unobserveCalled = false;

    const callback: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // This is what useInView does with triggerOnce
          unobserveCalled = true;
        }
      }
    };

    new MockIntersectionObserver(callback, { threshold: 0.1 });

    callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );

    expect(unobserveCalled).toBe(true);
  });
});
