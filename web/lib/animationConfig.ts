import type { CSSProperties } from "react";

export const ANIMATION_DURATION = "0.6s";
export const ANIMATION_EASING = "ease-out";
export const ANIMATION_DISTANCE = "20px";

export const hiddenStyle: CSSProperties = {
  opacity: 0,
  transform: `translateY(${ANIMATION_DISTANCE})`,
};

export const visibleStyle: CSSProperties = {
  opacity: 1,
  transform: "translateY(0)",
};

export function transitionString(delay = 0): string {
  const d = delay ? ` ${delay}ms` : "";
  return `opacity ${ANIMATION_DURATION} ${ANIMATION_EASING}${d}, transform ${ANIMATION_DURATION} ${ANIMATION_EASING}${d}`;
}
