"use client";

import { useMobileNav } from "@/components/mobile-nav-context";

/**
 * Mobile-only control: opens full-screen search overlay (compact top bar).
 */
export function TopbarSearchLauncher() {
  const { openSearch, searchOpen } = useMobileNav();

  if (searchOpen) return null;

  return (
    <button
      type="button"
      className="topbarSearchOpenBtn"
      onClick={openSearch}
      aria-label="Open stock search"
    >
      <span className="topbarSearchOpenBtnIcon" aria-hidden>
        &#x2315;
      </span>
    </button>
  );
}
