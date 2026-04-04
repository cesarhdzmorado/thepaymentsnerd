"use client";

import { Children, useEffect, useState, type ReactNode } from "react";
import { hiddenStyle, visibleStyle, transitionString } from "@/lib/animationConfig";

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
        ...(visible ? visibleStyle : hiddenStyle),
        transition: transitionString(),
      }}
    >
      {children}
    </div>
  );
}

interface HeroAnimationsProps {
  children: ReactNode;
}

export function HeroAnimations({ children }: HeroAnimationsProps) {
  const items = Children.toArray(children);
  return (
    <>
      {items.map((child, i) => (
        <HeroItem key={i} delay={i * 80}>
          {child}
        </HeroItem>
      ))}
    </>
  );
}
