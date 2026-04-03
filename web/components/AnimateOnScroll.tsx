"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

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
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
