"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { hiddenStyle, visibleStyle, transitionString } from "@/lib/animationConfig";

interface AnimateOnScrollProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function AnimateOnScroll({ children, delay = 0, className }: AnimateOnScrollProps) {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...(inView ? visibleStyle : hiddenStyle),
        transition: transitionString(delay),
      }}
    >
      {children}
    </div>
  );
}
