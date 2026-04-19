// web/app/layout.tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NavigationBar } from "@/components/NavigationBar";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// Primary typeface — body + display, weights 400–900.
// Swiss minimal: one family does most of the lifting, weight drives hierarchy.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Mono — labels, numerals, datelines, tags.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "/thepaymentsnerd - Daily Payments News",
  description: "Five critical payments insights. Zero noise. Daily.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "/thepaymentsnerd - Daily Payments News",
    description: "Five critical payments insights. Zero noise. Daily.",
    url: "https://www.thepaymentsnerd.co",
    siteName: "/thepaymentsnerd",
    type: "website",
    images: [
      {
        url: "https://www.thepaymentsnerd.co/og-image.png",
        width: 1200,
        height: 630,
        alt: "/thepaymentsnerd - Daily Payments News",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "/thepaymentsnerd - Daily Payments News",
    description: "Five critical payments insights. Zero noise. Daily.",
    images: ["https://www.thepaymentsnerd.co/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={[
          inter.variable,
          jetbrainsMono.variable,
          "min-h-screen antialiased font-sans",
          // force the entire app to respect your CSS variables in globals.css
          "bg-[var(--background)] text-[var(--foreground)]",
        ].join(" ")}
      >
        <a
          href="#main-content"
          className="sr-only-focusable"
        >
          Skip to content
        </a>
        <div className="min-h-screen">
          <NavigationBar />

          <main id="main-content" tabIndex={-1} className="relative min-h-screen pt-[60px]">
            {children}
          </main>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
