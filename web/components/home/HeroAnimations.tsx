"use client";

import { useEffect, useState, type ReactNode } from "react";

interface HeroItemProps {
  children: ReactNode;
  delay: number;
}

function HeroItem({ children, delay }: HeroItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }

    const timeout = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
      }}
    >
      {children}
    </div>
  );
}

interface HeroAnimationsProps {
  children: ReactNode[];
}

export function HeroAnimations({ children }: HeroAnimationsProps) {
  return (
    <>
      {children.map((child, i) => (
        <HeroItem key={i} delay={i * 80}>
          {child}
        </HeroItem>
      ))}
    </>
  );
}
