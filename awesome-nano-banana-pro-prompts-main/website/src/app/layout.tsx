import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nano Banana Pro — 2500 AI Image Prompts",
  description: "Explore 2,500 beautifully curated AI image generation prompts for Nano Banana Pro. Search, filter, copy, and create.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍌</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[var(--color-surface)] text-[var(--color-text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
