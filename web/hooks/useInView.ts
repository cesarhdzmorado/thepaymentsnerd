"use client";

import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  threshold?: number;
  triggerOnce?: boolean;
}

export function useInView({ threshold = 0.1, triggerOnce = true }: UseInViewOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  // Start as true (visible) for SSR. Client will set to false if element is out of viewport.
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver support: stay visible
    if (typeof IntersectionObserver === "undefined") return;

    // Before observing, check if the element is already in the viewport.
    // If it is, keep inView=true (no flash). If not, set to false so it can animate in.
    const rect = el.getBoundingClientRect();
    const isCurrentlyVisible =
      rect.top < window.innerHeight && rect.bottom > 0;

    if (!isCurrentlyVisible) {
      setInView(false);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) observer.unobserve(el);
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, triggerOnce]);

  return { ref, inView };
}
