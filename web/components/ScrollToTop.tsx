// web/components/ScrollToTop.tsx
"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button when user scrolls down 400px
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial scroll position
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="scroll-to-top group animate-fade-in"
      aria-label="Scroll to top"
      title="Back to top"
    >
      <ArrowUp className="h-5 w-5 text-[var(--ink-3)] transition-transform duration-300 group-hover:-translate-y-1 group-active:translate-y-0" />
    </button>
  );
}
