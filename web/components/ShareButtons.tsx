"use client";

import { Share2, Check } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { buttonClasses } from "./ui";

interface ShareButtonsProps {
  url?: string;
}

export function ShareButtons({ url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url || "https://www.thepaymentsnerd.co");

  useEffect(() => {
    if (url) {
      setCurrentUrl(url);
      return;
    }

    setCurrentUrl(window.location.href);
  }, [url]);

  // Default values
  const shareUrl = currentUrl;

  // Simple, clean X share text
  const xText = "www.thepaymentsnerd.co 👀";
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(shareUrl)}`;

  // LinkedIn share URL (LinkedIn doesn't support pre-populated text anymore)
  // The OG tags will provide rich preview automatically
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-[var(--muted)] transition-colors duration-200">
        Share:
      </span>

      {/* X */}
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${buttonClasses({ variant: "ghost", size: "sm" })} group hover:scale-105 hover:shadow-md active:scale-95`}
        aria-label="Share on X"
      >
        <Image src="/images/x-logo.png" alt="X" width={16} height={16} className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12 dark:brightness-0 dark:invert" />
        <span className="hidden sm:inline">X</span>
      </a>

      {/* LinkedIn */}
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${buttonClasses({ variant: "ghost", size: "sm" })} group hover:scale-105 hover:shadow-md active:scale-95`}
        aria-label="Share on LinkedIn"
      >
        <Image src="/images/linkedin-logo.png" alt="LinkedIn" width={16} height={16} className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
        <span className="hidden sm:inline">LinkedIn</span>
      </a>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className={`${buttonClasses({ variant: copied ? "secondary" : "ghost", size: "sm" })} group hover:scale-105 hover:shadow-md active:scale-95 ${
          copied
            ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
            : "hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 hover:text-green-600 dark:hover:text-green-400"
        }`}
        aria-label="Copy link"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 animate-scale-in" />
            <span className="hidden sm:inline">Copied!</span>
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" />
            <span className="hidden sm:inline">Copy Link</span>
          </>
        )}
      </button>
    </div>
  );
}
