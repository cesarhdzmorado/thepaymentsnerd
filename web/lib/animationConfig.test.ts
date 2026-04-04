import { describe, expect, it } from "vitest";
import {
  ANIMATION_DURATION,
  ANIMATION_EASING,
  ANIMATION_DISTANCE,
  hiddenStyle,
  visibleStyle,
  transitionString,
} from "./animationConfig";

describe("animationConfig", () => {
  it("exports consistent hidden and visible styles", () => {
    expect(hiddenStyle.opacity).toBe(0);
    expect(hiddenStyle.transform).toContain(ANIMATION_DISTANCE);

    expect(visibleStyle.opacity).toBe(1);
    expect(visibleStyle.transform).toBe("translateY(0)");
  });

  it("transitionString includes duration and easing", () => {
    const result = transitionString();
    expect(result).toContain(ANIMATION_DURATION);
    expect(result).toContain(ANIMATION_EASING);
    expect(result).toContain("opacity");
    expect(result).toContain("transform");
  });

  it("transitionString includes delay when provided", () => {
    const result = transitionString(200);
    expect(result).toContain("200ms");
  });

  it("transitionString omits delay when 0", () => {
    const result = transitionString(0);
    expect(result).not.toContain("ms");
  });
});
