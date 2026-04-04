// web/components/Footer.tsx
"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

export function Footer() {
  const [heartClicks, setHeartClicks] = useState(0);

  const footerLinks = [
    { name: "Advertise", href: "mailto:cesar@thepaymentsnerd.co?subject=Sponsorship%20Inquiry%20%E2%80%94%20The%20Payments%20Nerd" },
    { name: "Legal Terms", href: "/legal" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Cookies Policy", href: "/cookies" },
  ];

  const handleHeartClick = () => {
    setHeartClicks((prev) => prev + 1);
  };

  return (
    <footer
      className="
        mt-20 pt-10 pb-6
        border-t border-slate-200/80
        dark:border-slate-700/60
        text-slate-500
        dark:text-slate-400
        relative
      "
    >
      {/* Top gradient accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200/60 to-transparent dark:via-cyan-700/40" />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="text-center sm:text-left">
          <p className="text-sm flex items-center gap-1.5 justify-center sm:justify-start">
            © {new Date().getFullYear()}{" "}
            <span className="font-display font-semibold text-slate-700 dark:text-slate-300 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent transition-all duration-300 hover:scale-105 inline-block cursor-default">
              /thepaymentsnerd
            </span>
          </p>
          <p className="text-xs mt-1.5 flex items-center gap-1.5 justify-center sm:justify-start text-slate-500 dark:text-slate-400">
            Made with{" "}
            <button
              onClick={handleHeartClick}
              className="group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-full p-0.5 transition-transform duration-200 hover:scale-125 active:scale-90"
              aria-label="Show some love"
            >
              <Heart
                className={`h-3 w-3 text-red-500 dark:text-red-400 fill-current transition-all duration-300 ${
                  heartClicks > 0 ? "animate-pulse" : ""
                }`}
              />
              {heartClicks > 0 && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-500 dark:text-red-400 animate-fade-in pointer-events-none">
                  +{heartClicks}
                </span>
              )}
            </button>{" "}
            for the payments community
          </p>
        </div>

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {footerLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="
                text-sm font-medium
                text-slate-600 dark:text-slate-400
                hover:text-blue-700 dark:hover:text-cyan-300
                transition-all duration-300
                hover:underline underline-offset-4
                decoration-2 decoration-blue-600/50 dark:decoration-cyan-400/50
                hover:scale-105 inline-block
              "
            >
              {link.name}
            </a>
          ))}
        </nav>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400 transition-colors duration-300">
          Five critical payments insights. Zero noise. Daily.
        </p>
      </div>
    </footer>
  );
}
