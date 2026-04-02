"use client";

import { useEffect } from "react";

/**
 * Adds/removes 'topbarScrolled' class on the topbar header
 * to show a subtle shadow when the page is scrolled.
 */
export function TopbarScroll() {
  useEffect(() => {
    const topbar = document.querySelector<HTMLElement>(".topbar");
    if (!topbar) return;

    const handleScroll = () => {
      if (window.scrollY > 8) {
        topbar.classList.add("topbarScrolled");
      } else {
        topbar.classList.remove("topbarScrolled");
      }
    };

    // Check initial state
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return null;
}
