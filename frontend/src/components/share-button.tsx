"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/toast";

type Props = {
  title: string;
  text: string;
  url?: string;
};

export function ShareButton({ title, text, url }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const shareUrl = url || window.location.href;

    // Try native share API first (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        // User cancelled or not supported, fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast("Link copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy link", "error");
    }
  }, [title, text, url, toast]);

  return (
    <button
      onClick={handleShare}
      type="button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 8,
        border: "1px solid var(--line)",
        background: "var(--panel)",
        color: "var(--text-secondary)",
        fontSize: "0.82rem",
        fontWeight: 500,
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "all 150ms ease",
      }}
      aria-label="Share this page"
    >
      <span aria-hidden="true" style={{ fontSize: "0.9rem" }}>
        {copied ? "\u2713" : "\u2197"}
      </span>
      {copied ? "Copied" : "Share"}
    </button>
  );
}
