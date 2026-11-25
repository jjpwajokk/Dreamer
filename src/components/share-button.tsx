"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { buttonClass } from "@/components/ui";

export function ShareButton({ url, text, label = "Share" }: { url: string; text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ url, text });
        return;
      } catch {
        // cancelled
      }
    }
    await navigator.clipboard?.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex gap-2">
      <button onClick={share} className={buttonClass("secondary", "md")}>
        <Share2 className="h-4 w-4" aria-hidden /> {copied ? "Link copied" : label}
      </button>
      <a
        className={buttonClass("secondary", "md")}
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp
      </a>
    </div>
  );
}
